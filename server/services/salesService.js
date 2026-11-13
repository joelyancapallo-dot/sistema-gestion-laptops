const db = require('../db');
const CommissionService = require('./commissionService');

class SalesService {
  /**
   * Genera el siguiente código de venta: VTA-YYYYMM-0001
   */
  static async generateSaleCode(client, saleDate = new Date()) {
    let yearMonth;
    if (typeof saleDate === 'string' && /^\d{4}-\d{2}/.test(saleDate)) {
      yearMonth = saleDate.slice(0, 7).replace('-', '');
    } else {
      const d = saleDate instanceof Date ? saleDate : new Date(saleDate);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      yearMonth = `${y}${m}`;
    }
    const prefix = `VTA-${yearMonth}-`;

    const res = await client.query(`
      SELECT codigo_venta 
      FROM ventas 
      WHERE codigo_venta LIKE $1
      ORDER BY codigo_venta DESC 
      LIMIT 1;
    `, [`${prefix}%`]);

    let nextNum = 1;
    if (res.rows.length > 0) {
      const lastCode = res.rows[0].codigo_venta;
      const parts = lastCode.split('-');
      if (parts.length === 3) {
        nextNum = parseInt(parts[2], 10) + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Registra una nueva venta con validación de precios mínimos, cálculo de diferencias y comisiones
   */
  static async registerSale(data, currentUser) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const {
        laptop_id,
        vendedor_id,
        precio_venta_final,
        metodo_pago,
        fecha_venta,
        estado = 'pagada',
        es_excepcion_precio = false,
        motivo_excepcion = null,
        notas = null
      } = data;

      let finalFechaVenta = fecha_venta;
      if (!finalFechaVenta || typeof finalFechaVenta !== 'string') {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        finalFechaVenta = `${y}-${m}-${d}`;
      } else {
        finalFechaVenta = finalFechaVenta.slice(0, 10);
      }
      const monthYear = finalFechaVenta.slice(0, 7);

      // 1. Obtener y validar el equipo
      const laptopRes = await client.query(`
        SELECT l.*, u_resp.nombre as responsable_nombre 
        FROM laptops l 
        LEFT JOIN usuarios u_resp ON l.responsable_id = u_resp.id
        WHERE l.id = $1 FOR UPDATE OF l;
      `, [laptop_id]);

      if (laptopRes.rows.length === 0) {
        throw new Error('La laptop seleccionada no existe.');
      }

      const laptop = laptopRes.rows[0];
      if (laptop.estado === 'vendida') {
        throw new Error(`La laptop ${laptop.marca} ${laptop.modelo} (${laptop.numero_serie}) ya fue vendida.`);
      }
      if (laptop.estado !== 'disponible' && laptop.estado !== 'reservada') {
        throw new Error(`La laptop ${laptop.marca} ${laptop.modelo} (${laptop.numero_serie}) no está disponible para venta (Estado: ${laptop.estado}).`);
      }

      // Regla de custodia física:
      // "La responsabilidad física de cada laptop pertenece al vendedor que la recibe y la registra a su cargo,
      // independientemente de quién concrete la venta."
      const responsableLaptopId = data.responsable_laptop_id 
        ? parseInt(data.responsable_laptop_id, 10) 
        : (laptop.responsable_id || parseInt(vendedor_id, 10));

      const costoAdq = parseFloat(laptop.costo_adquisicion);
      const gastosAdq = parseFloat(laptop.gastos_adquisicion || 0);
      const precioMin = parseFloat(laptop.precio_minimo);
      const precioFinal = parseFloat(precio_venta_final);

      if (isNaN(precioFinal) || precioFinal <= 0) {
        throw new Error('El precio final de venta debe ser un monto positivo válido.');
      }

      // 2. Control estricto de precios y excepciones
      let diferenciaVendedor = 0;
      let autorizadoPor = null;

      if (precioFinal < precioMin) {
        // Bloqueo: menor al mínimo
        const isAdmin = currentUser && currentUser.rol === 'admin';
        if (!isAdmin && !es_excepcion_precio) {
          throw new Error(`No se permite registrar ventas por debajo del precio mínimo autorizado (Mínimo: S/ ${precioMin.toFixed(2)}, Ingresado: S/ ${precioFinal.toFixed(2)}) sin autorización explícita del administrador.`);
        }

        if (!motivo_excepcion || motivo_excepcion.trim().length === 0) {
          throw new Error('Para registrar una venta por debajo del precio mínimo se debe indicar obligatoriamente el motivo de la excepción.');
        }

        autorizadoPor = isAdmin ? currentUser.id : data.autorizado_por;
        diferenciaVendedor = 0.00; // No genera diferencia positiva
      } else {
        // 100% de la diferencia sobre el precio mínimo va para el vendedor que concreta la venta
        diferenciaVendedor = Math.round((precioFinal - precioMin) * 100) / 100;
      }

      // 3. Ganancia base del negocio
      // Base: Precio mínimo menos costos totales del equipo (o precio final si hubo excepción)
      const costoTotalEquipo = costoAdq + gastosAdq;
      const basePriceForProfit = Math.min(precioMin, precioFinal);
      const gananciaBaseNegocio = Math.round((basePriceForProfit - costoTotalEquipo) * 100) / 100;

      // 4. Generar código de venta
      const codigoVenta = await this.generateSaleCode(client, finalFechaVenta);

      // 5. Insertar la venta
      const insertRes = await client.query(`
        INSERT INTO ventas (
          codigo_venta, fecha_venta, vendedor_id, laptop_id,
          responsable_laptop_id,
          costo_adquisicion_hist, gastos_adquisicion_hist, precio_minimo_hist,
          precio_venta_final, diferencia_vendedor, comision_volumen,
          ganancia_base_negocio, ganancia_neta_negocio, metodo_pago,
          estado, es_excepcion_precio, motivo_excepcion, autorizado_por, notas
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0.00, $11, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING *;
      `, [
        codigoVenta,
        finalFechaVenta,
        vendedor_id,          // Vendedor que concreta la venta (recibe comisión y diferencia)
        laptop_id,
        responsableLaptopId,  // Vendedor que tenía la custodia física del equipo
        costoAdq,
        gastosAdq,
        precioMin,
        precioFinal,
        diferenciaVendedor,
        gananciaBaseNegocio,
        metodo_pago,
        estado,
        es_excepcion_precio || precioFinal < precioMin,
        motivo_excepcion,
        autorizadoPor,
        notas
      ]);

      const nuevaVenta = insertRes.rows[0];

      // 6. Actualizar estado de la laptop en catálogo (liberar datos de reserva si se vende)
      const nuevoEstadoLaptop = (estado === 'pendiente') ? 'reservada' : (['pagada', 'entregada'].includes(estado) ? 'vendida' : 'disponible');
      await client.query(`
        UPDATE laptops 
        SET estado = $1,
            reservado_por = NULL,
            fecha_reserva = NULL,
            reserva_expira_at = NULL,
            cliente_reserva = NULL,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2;
      `, [nuevoEstadoLaptop, laptop_id]);

      // 7. Sincronizar comisiones retroactivas del vendedor que concretó la venta para todo el mes
      if (['pagada', 'entregada'].includes(estado)) {
        await CommissionService.syncMonthlyVendorCommissions(vendedor_id, monthYear, client);
      }

      // 8. Registro de auditoría
      await client.query(`
        INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles_json)
        VALUES ($1, 'CREAR_VENTA', 'ventas', $2, $3);
      `, [
        currentUser ? currentUser.id : null,
        nuevaVenta.id,
        JSON.stringify({
          codigo: codigoVenta,
          laptop: `${laptop.marca} ${laptop.modelo} (${laptop.numero_serie})`,
          vendedor_concreta_venta_id: vendedor_id,
          responsable_custodia_laptop_id: responsableLaptopId,
          es_venta_cruzada: parseInt(vendedor_id, 10) !== parseInt(responsableLaptopId, 10),
          precioMin,
          precioFinal,
          diferenciaVendedor,
          esExcepcion: es_excepcion_precio || precioFinal < precioMin
        })
      ]);

      await client.query('COMMIT');
      return nuevaVenta;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Cambia el estado de una operación (pagada, entregada, anulada, devuelta, pendiente)
   */
  static async updateSaleStatus(saleId, newStatus, reason = null, currentUser = null) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const saleRes = await client.query(`
        SELECT v.*, l.id as laptop_id, l.marca, l.modelo 
        FROM ventas v
        JOIN laptops l ON v.laptop_id = l.id
        WHERE v.id = $1 FOR UPDATE OF v;
      `, [saleId]);

      if (saleRes.rows.length === 0) {
        throw new Error('Venta no encontrada.');
      }

      const sale = saleRes.rows[0];
      const oldStatus = sale.estado;
      const monthYear = new Date(sale.fecha_venta).toISOString().slice(0, 7);

      if (oldStatus === newStatus) {
        await client.query('COMMIT');
        return sale;
      }

      // Actualizar venta
      await client.query(`
        UPDATE ventas 
        SET estado = $1, 
            notas = CASE WHEN $2::text IS NOT NULL THEN COALESCE(notas || E'\\n', '') || $2::text ELSE notas END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3;
      `, [newStatus, reason ? `[${new Date().toLocaleDateString()}] Cambio a ${newStatus}: ${reason}` : null, saleId]);

      // Actualizar inventario según nuevo estado
      let nuevoEstadoLaptop = 'disponible';
      if (['pagada', 'entregada'].includes(newStatus)) {
        nuevoEstadoLaptop = 'vendida';
      } else if (newStatus === 'pendiente') {
        nuevoEstadoLaptop = 'reservada';
      } else if (['anulada', 'devuelta'].includes(newStatus)) {
        // Al anular o devolver, la laptop VUELVE A ESTAR DISPONIBLE para venderse
        nuevoEstadoLaptop = 'disponible';
      }

      await client.query(`
        UPDATE laptops SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;
      `, [nuevoEstadoLaptop, sale.laptop_id]);

      // Sincronizar comisiones retroactivas del vendedor
      await CommissionService.syncMonthlyVendorCommissions(sale.vendedor_id, monthYear, client);

      // Registrar auditoría
      await client.query(`
        INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles_json)
        VALUES ($1, 'CAMBIO_ESTADO_VENTA', 'ventas', $2, $3);
      `, [
        currentUser ? currentUser.id : null,
        saleId,
        JSON.stringify({
          codigo: sale.codigo_venta,
          estadoAnterior: oldStatus,
          estadoNuevo: newStatus,
          motivo: reason
        })
      ]);

      await client.query('COMMIT');
      return { success: true, saleId, oldStatus, newStatus };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina permanentemente una venta del sistema:
   * 1. Obtiene los datos de la venta y laptop asociada.
   * 2. Elimina el registro de la venta en la base de datos.
   * 3. Retorna la laptop a estado 'disponible' en el inventario.
   * 4. Recalcula y sincroniza retroactivamente las comisiones del vendedor para el mes.
   * 5. Registra la auditoría de eliminación.
   */
  static async deleteSale(saleId, currentUser = null) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const saleRes = await client.query(`
        SELECT v.*, l.id as laptop_id, l.marca, l.modelo, l.numero_serie
        FROM ventas v
        JOIN laptops l ON v.laptop_id = l.id
        WHERE v.id = $1 FOR UPDATE OF v;
      `, [saleId]);

      if (saleRes.rows.length === 0) {
        throw new Error('Venta no encontrada.');
      }

      const sale = saleRes.rows[0];
      const monthYear = new Date(sale.fecha_venta).toISOString().slice(0, 7);

      // 1. Eliminar registro de venta
      await client.query('DELETE FROM ventas WHERE id = $1;', [saleId]);

      // 2. Regresar laptop a estado disponible en el catálogo
      await client.query(`
        UPDATE laptops 
        SET estado = 'disponible', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1;
      `, [sale.laptop_id]);

      // 3. Sincronizar comisiones mensuales del vendedor de forma retroactiva
      await CommissionService.syncMonthlyVendorCommissions(sale.vendedor_id, monthYear, client);

      // 4. Registro de auditoría
      await client.query(`
        INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles_json)
        VALUES ($1, 'ELIMINAR_VENTA', 'ventas', $2, $3);
      `, [
        currentUser ? currentUser.id : null,
        saleId,
        JSON.stringify({
          codigo: sale.codigo_venta,
          laptop: `${sale.marca} ${sale.modelo} (${sale.numero_serie})`,
          precioVentaFinal: sale.precio_venta_final,
          vendedor_id: sale.vendedor_id,
          fecha_venta: sale.fecha_venta
        })
      ]);

      await client.query('COMMIT');
      return { success: true, message: `Venta ${sale.codigo_venta} eliminada con éxito y laptop restaurada a disponible.` };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Consulta avanzada de ventas con filtros de fecha, vendedor, condición y búsqueda
   */
  static async getSales(filters = {}) {
    const {
      vendedor_id,
      responsable_id,
      monthYear,
      estado,
      condicion,
      search,
      limit = 100,
      offset = 0
    } = filters;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (vendedor_id) {
      conditions.push(`v.vendedor_id = $${paramIndex++}`);
      params.push(vendedor_id);
    }

    if (responsable_id) {
      conditions.push(`COALESCE(v.responsable_laptop_id, l.responsable_id) = $${paramIndex++}`);
      params.push(responsable_id);
    }

    if (monthYear) {
      conditions.push(`TO_CHAR(v.fecha_venta, 'YYYY-MM') = $${paramIndex++}`);
      params.push(monthYear);
    }

    if (estado) {
      conditions.push(`v.estado = $${paramIndex++}`);
      params.push(estado);
    }

    if (condicion) {
      conditions.push(`l.condicion = $${paramIndex++}`);
      params.push(condicion);
    }

    if (search) {
      conditions.push(`(
        v.codigo_venta ILIKE $${paramIndex} OR 
        l.numero_serie ILIKE $${paramIndex} OR 
        l.marca ILIKE $${paramIndex} OR 
        l.modelo ILIKE $${paramIndex} OR 
        u.nombre ILIKE $${paramIndex} OR
        u_resp.nombre ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT 
        v.*,
        l.marca,
        l.modelo,
        l.numero_serie,
        l.condicion,
        l.procesador,
        l.ram,
        l.almacenamiento,
        u.nombre as vendedor_nombre,
        u.email as vendedor_email,
        COALESCE(v.responsable_laptop_id, l.responsable_id) as responsable_laptop_id,
        u_resp.nombre as responsable_nombre,
        u_resp.email as responsable_email,
        admin_u.nombre as autorizado_por_nombre
      FROM ventas v
      JOIN laptops l ON v.laptop_id = l.id
      JOIN usuarios u ON v.vendedor_id = u.id
      LEFT JOIN usuarios u_resp ON COALESCE(v.responsable_laptop_id, l.responsable_id) = u_resp.id
      LEFT JOIN usuarios admin_u ON v.autorizado_por = admin_u.id
      ${whereClause}
      ORDER BY v.fecha_venta DESC, v.id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex};
    `;

    params.push(limit, offset);

    const res = await db.query(queryText, params);
    return res.rows;
  }
}

module.exports = SalesService;
