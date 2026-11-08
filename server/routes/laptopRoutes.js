const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');

// Configuración de almacenamiento permanente de fotografías
const uploadsDir = path.join(__dirname, '../uploads/laptops');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `laptop-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Formato no permitido. Solo se aceptan imágenes en formato JPG, JPEG, PNG y WEBP.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Máximo 5 MB por fotografía
  fileFilter: fileFilter
});

// Helper de seguridad: Validar si el usuario tiene rol de Administrador
function checkAdminRole(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/authMiddleware');
      const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET);
      if (decoded.rol === 'admin') return true;
    } catch (_) {}
  }
  if (req.user?.rol === 'admin') return true;
  if (req.headers['x-user-role'] === 'admin') return true;
  return false;
}

// Subir fotografías temporales / previas (Solo Administrador)
router.post('/upload', (req, res) => {
  if (!checkAdminRole(req)) {
    return res.status(403).json({
      error: 'Permiso denegado. Únicamente el Administrador puede subir fotografías de laptops.'
    });
  }

  upload.array('fotos', 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'La fotografía excede el tamaño máximo permitido de 5 MB.' });
      }
      return res.status(400).json({ error: `Error de carga: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se seleccionaron archivos para subir.' });
    }

    const files = req.files.map((file, idx) => ({
      url: `/uploads/laptops/${file.filename}`,
      nombre_archivo: file.originalname,
      es_portada: idx === 0
    }));

    res.json({ files });
  });
});

// Listar laptops con filtros y control de privacidad (vendedor vs admin)
router.get('/', async (req, res) => {
  try {
    const { estado, condicion, search, rol, responsable_id } = req.query;

    // Liberar automáticamente reservas que hayan superado las 24 horas
    await db.query(`
      UPDATE laptops
      SET estado = 'disponible',
          reservado_por = NULL,
          fecha_reserva = NULL,
          reserva_expira_at = NULL,
          cliente_reserva = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE estado = 'reservada' AND reserva_expira_at IS NOT NULL AND reserva_expira_at < CURRENT_TIMESTAMP;
    `);

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (estado) {
      conditions.push(`l.estado = $${paramIndex++}`);
      params.push(estado);
    }

    if (condicion) {
      conditions.push(`l.condicion = $${paramIndex++}`);
      params.push(condicion);
    }

    if (responsable_id) {
      conditions.push(`l.responsable_id = $${paramIndex++}`);
      params.push(responsable_id);
    }

    if (search) {
      conditions.push(`(
        l.marca ILIKE $${paramIndex} OR 
        l.modelo ILIKE $${paramIndex} OR 
        l.numero_serie ILIKE $${paramIndex} OR
        l.procesador ILIKE $${paramIndex} OR
        u_resp.nombre ILIKE $${paramIndex} OR
        u_res.nombre ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let selectFields = `
      l.id, l.marca, l.modelo, l.numero_serie, l.condicion,
      l.procesador, l.ram, l.almacenamiento, l.pantalla,
      l.precio_minimo, l.precio_sugerido, l.estado, l.created_at,
      l.responsable_id, l.fecha_asignacion_responsable,
      l.foto_portada,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', img.id,
              'url', img.url,
              'nombre_archivo', img.nombre_archivo,
              'es_portada', img.es_portada,
              'orden', img.orden
            ) ORDER BY img.es_portada DESC, img.orden ASC, img.id ASC
          )
          FROM laptop_imagenes img
          WHERE img.laptop_id = l.id
        ),
        '[]'::json
      ) as imagenes,
      u_resp.nombre as responsable_nombre,
      u_resp.email as responsable_email,
      l.reservado_por, l.fecha_reserva, l.reserva_expira_at, l.cliente_reserva,
      u_res.nombre as reservado_por_nombre,
      u_res.email as reservado_por_email
    `;

    // Solo el administrador puede ver costos de adquisición y gastos
    if (rol === 'admin') {
      selectFields += `, l.costo_adquisicion, l.gastos_adquisicion, (l.precio_minimo - (l.costo_adquisicion + l.gastos_adquisicion)) as ganancia_base`;
    }

    const query = `
      SELECT ${selectFields}
      FROM laptops l
      LEFT JOIN usuarios u_resp ON l.responsable_id = u_resp.id
      LEFT JOIN usuarios u_res ON l.reservado_por = u_res.id
      ${whereClause}
      ORDER BY l.id DESC;
    `;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando laptops:', err);
    res.status(500).json({ error: 'Error al consultar catálogo de laptops.' });
  }
});

// Obtener el siguiente número de serie correlativo disponible (sin consumirlo)
router.get('/next-serial', async (req, res) => {
  try {
    await db.query('CREATE SEQUENCE IF NOT EXISTS laptops_sn_seq;');

    const result = await db.query(`
      SELECT 
        GREATEST(
          (CASE WHEN is_called THEN last_value + 1 ELSE last_value END),
          (SELECT COALESCE(MAX(SUBSTRING(numero_serie FROM '[0-9]+')::bigint), 0) + 1 FROM laptops)
        ) as next_num
      FROM laptops_sn_seq;
    `);

    const nextNum = parseInt(result.rows[0]?.next_num || 1, 10);
    const nextSerial = `SN-${String(nextNum).padStart(5, '0')}`;
    res.json({ nextSerial, nextNum });
  } catch (err) {
    console.error('Error obteniendo siguiente número de serie:', err);
    res.status(500).json({ error: 'Error al calcular siguiente número de serie.' });
  }
});

// Registrar nueva laptop con asignación de vendedor responsable de custodia física
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      marca,
      modelo,
      condicion,
      procesador,
      ram,
      almacenamiento,
      pantalla,
      costo_adquisicion,
      gastos_adquisicion,
      precio_minimo,
      precio_sugerido,
      estado = 'disponible',
      responsable_id,
      usuario_id
    } = req.body;

    if (!marca || !modelo || !condicion || !costo_adquisicion || !precio_minimo || !precio_sugerido) {
      return res.status(400).json({ 
        error: 'Marca, modelo, condición, costo, precio mínimo y sugerido son obligatorios.' 
      });
    }

    // Gasto adicional predeterminado en S/ 15.00 si no se ingresa
    const finalGastos = (gastos_adquisicion !== undefined && gastos_adquisicion !== null && gastos_adquisicion !== '')
      ? parseFloat(gastos_adquisicion)
      : 15.00;

    const costoTotal = parseFloat(costo_adquisicion) + finalGastos;
    const minPrice = parseFloat(precio_minimo);

    if (minPrice < costoTotal) {
      return res.status(400).json({ 
        error: `El precio mínimo (S/ ${minPrice.toFixed(2)}) no puede ser menor al costo total del equipo (S/ ${costoTotal.toFixed(2)}).` 
      });
    }

    // Determinar responsable de custodia física (por defecto el primer vendedor si no se especifica)
    let finalResponsableId = responsable_id ? parseInt(responsable_id, 10) : null;
    if (!finalResponsableId) {
      const defaultVendor = await client.query("SELECT id FROM usuarios WHERE rol = 'vendedor' ORDER BY id ASC LIMIT 1;");
      if (defaultVendor.rows.length > 0) {
        finalResponsableId = defaultVendor.rows[0].id;
      }
    }

    await client.query('BEGIN');

    // Sincronizar secuencia si hay un valor mayor en la tabla antes de obtener el siguiente
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS laptops_sn_seq;
      DO $$
      DECLARE
        max_val bigint;
        seq_val bigint;
        seq_called boolean;
      BEGIN
        SELECT COALESCE(MAX(SUBSTRING(numero_serie FROM '[0-9]+')::bigint), 0) INTO max_val FROM laptops;
        SELECT last_value, is_called INTO seq_val, seq_called FROM laptops_sn_seq;
        IF max_val > 0 THEN
          IF seq_val < max_val OR NOT seq_called THEN
            PERFORM setval('laptops_sn_seq', max_val, true);
          END IF;
        END IF;
      END $$;
    `);

    // Generar atómicamente el número de serie único y correlativo
    const seqResult = await client.query("SELECT nextval('laptops_sn_seq') as next_val;");
    const nextVal = parseInt(seqResult.rows[0].next_val, 10);
    const finalNumeroSerie = `SN-${String(nextVal).padStart(5, '0')}`;

    const insertRes = await client.query(`
      INSERT INTO laptops (
        marca, modelo, numero_serie, condicion,
        procesador, ram, almacenamiento, pantalla,
        costo_adquisicion, gastos_adquisicion, precio_minimo, precio_sugerido, estado,
        responsable_id, fecha_asignacion_responsable
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
      RETURNING *;
    `, [
      marca.trim(),
      modelo.trim(),
      finalNumeroSerie,
      condicion,
      procesador || null,
      ram || null,
      almacenamiento || null,
      pantalla || null,
      parseFloat(costo_adquisicion),
      finalGastos,
      minPrice,
      parseFloat(precio_sugerido),
      estado,
      finalResponsableId
    ]);

    const newLaptop = insertRes.rows[0];

    // Guardar fotografías si fueron proporcionadas (Solo Administrador)
    const fotos = Array.isArray(req.body.fotos) ? req.body.fotos : (Array.isArray(req.body.imagenes) ? req.body.imagenes : []);
    let portadaUrl = null;

    if (fotos.length > 0) {
      for (let i = 0; i < fotos.length; i++) {
        const f = fotos[i];
        const isCover = f.es_portada === true || (i === 0 && !fotos.some(item => item.es_portada));
        if (isCover && !portadaUrl) {
          portadaUrl = f.url;
        }
        await client.query(`
          INSERT INTO laptop_imagenes (laptop_id, url, nombre_archivo, es_portada, orden)
          VALUES ($1, $2, $3, $4, $5);
        `, [newLaptop.id, f.url, f.nombre_archivo || 'fotografia.jpg', isCover, i]);
      }

      if (portadaUrl) {
        await client.query(`UPDATE laptops SET foto_portada = $1 WHERE id = $2;`, [portadaUrl, newLaptop.id]);
      }
    }

    // Registrar en auditoría
    await client.query(`
      INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles_json)
      VALUES ($1, 'REGISTRAR_LAPTOP', 'laptops', $2, $3);
    `, [
      usuario_id || null,
      newLaptop.id,
      JSON.stringify({
        laptop: `${newLaptop.marca} ${newLaptop.modelo} (${newLaptop.numero_serie})`,
        responsable_id: finalResponsableId,
        costoTotal,
        precioMinimo: minPrice,
        precioSugerido: parseFloat(precio_sugerido),
        totalFotos: fotos.length
      })
    ]);

    await client.query('COMMIT');

    // Retornar con el nombre del responsable y lista completa de fotografías
    const fullLaptopRes = await client.query(`
      SELECT l.*, u.nombre as responsable_nombre,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', img.id,
              'url', img.url,
              'nombre_archivo', img.nombre_archivo,
              'es_portada', img.es_portada,
              'orden', img.orden
            ) ORDER BY img.es_portada DESC, img.orden ASC, img.id ASC
          )
          FROM laptop_imagenes img
          WHERE img.laptop_id = l.id
        ),
        '[]'::json
      ) as imagenes
      FROM laptops l 
      LEFT JOIN usuarios u ON l.responsable_id = u.id 
      WHERE l.id = $1;
    `, [newLaptop.id]);

    res.status(201).json(fullLaptopRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error registrando laptop:', err);
    res.status(500).json({ error: 'Error al registrar laptop en inventario: ' + err.message });
  } finally {
    client.release();
  }
});

// Modificar laptop existente (incluyendo reasignación de responsable y fotografías)
router.put('/:id', async (req, res) => {
  if (!checkAdminRole(req)) {
    return res.status(403).json({
      error: 'Permiso denegado. Solo el Administrador puede editar laptops.'
    });
  }

  try {
    const { id } = req.params;
    const {
      marca,
      modelo,
      numero_serie,
      condicion,
      procesador,
      ram,
      almacenamiento,
      pantalla,
      costo_adquisicion,
      gastos_adquisicion,
      precio_minimo,
      precio_sugerido,
      estado,
      responsable_id
    } = req.body;

    const result = await db.query(`
      UPDATE laptops
      SET marca = COALESCE($1, marca),
          modelo = COALESCE($2, modelo),
          numero_serie = COALESCE($3, numero_serie),
          condicion = COALESCE($4, condicion),
          procesador = COALESCE($5, procesador),
          ram = COALESCE($6, ram),
          almacenamiento = COALESCE($7, almacenamiento),
          pantalla = COALESCE($8, pantalla),
          costo_adquisicion = COALESCE($9, costo_adquisicion),
          gastos_adquisicion = COALESCE($10, gastos_adquisicion),
          precio_minimo = COALESCE($11, precio_minimo),
          precio_sugerido = COALESCE($12, precio_sugerido),
          estado = COALESCE($13, estado),
          responsable_id = COALESCE($14, responsable_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *, (precio_minimo - (costo_adquisicion + gastos_adquisicion)) as ganancia_base;
    `, [
      marca, modelo, numero_serie, condicion,
      procesador, ram, almacenamiento, pantalla,
      costo_adquisicion, gastos_adquisicion, precio_minimo, precio_sugerido,
      estado, responsable_id ? parseInt(responsable_id, 10) : null, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop no encontrada.' });
    }

    // Si se enviaron fotografías, sincronizarlas
    if (req.body.fotos !== undefined || req.body.imagenes !== undefined) {
      const fotos = Array.isArray(req.body.fotos) ? req.body.fotos : (Array.isArray(req.body.imagenes) ? req.body.imagenes : []);
      
      // Limpiar imágenes anteriores para re-sincronizar
      await db.query('DELETE FROM laptop_imagenes WHERE laptop_id = $1;', [id]);

      let portadaUrl = null;
      for (let i = 0; i < fotos.length; i++) {
        const f = fotos[i];
        const isCover = f.es_portada === true || (i === 0 && !fotos.some(item => item.es_portada));
        if (isCover && !portadaUrl) {
          portadaUrl = f.url;
        }
        await db.query(`
          INSERT INTO laptop_imagenes (laptop_id, url, nombre_archivo, es_portada, orden)
          VALUES ($1, $2, $3, $4, $5);
        `, [id, f.url, f.nombre_archivo || 'fotografia.jpg', isCover, i]);
      }

      await db.query('UPDATE laptops SET foto_portada = $1 WHERE id = $2;', [portadaUrl, id]);
    }

    const fullLaptopRes = await db.query(`
      SELECT l.*, u.nombre as responsable_nombre,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', img.id,
              'url', img.url,
              'nombre_archivo', img.nombre_archivo,
              'es_portada', img.es_portada,
              'orden', img.orden
            ) ORDER BY img.es_portada DESC, img.orden ASC, img.id ASC
          )
          FROM laptop_imagenes img
          WHERE img.laptop_id = l.id
        ),
        '[]'::json
      ) as imagenes
      FROM laptops l 
      LEFT JOIN usuarios u ON l.responsable_id = u.id 
      WHERE l.id = $1;
    `, [id]);

    res.json(fullLaptopRes.rows[0]);
  } catch (err) {
    console.error('Error modificando laptop:', err);
    res.status(500).json({ error: 'Error al actualizar laptop.' });
  }
});

// Eliminar fotografía individual de una laptop (Solo Administrador)
router.delete('/:id/fotos/:fotoId', async (req, res) => {
  if (!checkAdminRole(req)) {
    return res.status(403).json({
      error: 'Permiso denegado. Solo el Administrador puede eliminar fotografías de productos.'
    });
  }

  try {
    const { id, fotoId } = req.params;
    const imgRes = await db.query('SELECT * FROM laptop_imagenes WHERE id = $1 AND laptop_id = $2;', [fotoId, id]);
    if (imgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fotografía no encontrada.' });
    }

    const img = imgRes.rows[0];

    // Eliminar archivo físico del disco si existe
    const fileName = path.basename(img.url);
    const filePath = path.join(uploadsDir, fileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Aviso: No se pudo eliminar archivo físico de imagen:', e.message);
      }
    }

    // Eliminar registro de la base de datos
    await db.query('DELETE FROM laptop_imagenes WHERE id = $1;', [fotoId]);

    // Si la fotografía eliminada era la portada, promover la siguiente fotografía disponible
    if (img.es_portada) {
      const nextImg = await db.query('SELECT * FROM laptop_imagenes WHERE laptop_id = $1 ORDER BY orden ASC, id ASC LIMIT 1;', [id]);
      if (nextImg.rows.length > 0) {
        await db.query('UPDATE laptop_imagenes SET es_portada = TRUE WHERE id = $1;', [nextImg.rows[0].id]);
        await db.query('UPDATE laptops SET foto_portada = $1 WHERE id = $2;', [nextImg.rows[0].url, id]);
      } else {
        await db.query('UPDATE laptops SET foto_portada = NULL WHERE id = $1;', [id]);
      }
    }

    res.json({ success: true, message: 'Fotografía eliminada correctamente.' });
  } catch (err) {
    console.error('Error eliminando fotografía:', err);
    res.status(500).json({ error: 'Error al eliminar fotografía.' });
  }
});

// Establecer fotografía como portada / principal (Solo Administrador)
router.put('/:id/fotos/:fotoId/portada', async (req, res) => {
  if (!checkAdminRole(req)) {
    return res.status(403).json({
      error: 'Permiso denegado. Solo el Administrador puede definir la fotografía principal.'
    });
  }

  try {
    const { id, fotoId } = req.params;
    const imgRes = await db.query('SELECT * FROM laptop_imagenes WHERE id = $1 AND laptop_id = $2;', [fotoId, id]);
    if (imgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fotografía no encontrada.' });
    }

    const targetUrl = imgRes.rows[0].url;

    // Desmarcar portadas anteriores y marcar la seleccionada
    await db.query('UPDATE laptop_imagenes SET es_portada = FALSE WHERE laptop_id = $1;', [id]);
    await db.query('UPDATE laptop_imagenes SET es_portada = TRUE WHERE id = $1;', [fotoId]);
    await db.query('UPDATE laptops SET foto_portada = $1 WHERE id = $2;', [targetUrl, id]);

    res.json({ success: true, foto_portada: targetUrl });
  } catch (err) {
    console.error('Error definiendo portada:', err);
    res.status(500).json({ error: 'Error al establecer fotografía de portada.' });
  }
});

// Transferir custodia física de la laptop a otro vendedor (RESTRINGIDO EXCLUSIVAMENTE A ADMINISTRADOR)
router.put('/:id/transferir', async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevo_responsable_id, motivo, usuario_id } = req.body;

    // Control de acceso RBAC: Solo administrador puede transferir custodia
    const reqUserId = usuario_id || req.headers['x-user-id'];
    let isAdmin = req.headers['x-user-role'] === 'admin';
    if (!isAdmin && reqUserId) {
      const uRes = await db.query('SELECT rol FROM usuarios WHERE id = $1', [reqUserId]);
      if (uRes.rows.length > 0 && uRes.rows[0].rol === 'admin') {
        isAdmin = true;
      }
    }
    if (!isAdmin) {
      return res.status(403).json({ error: 'Permiso denegado. Solo el perfil de Administrador tiene autorización para determinar y transferir la custodia física de equipos.' });
    }

    if (!nuevo_responsable_id) {
      return res.status(400).json({ error: 'El nuevo vendedor responsable es obligatorio.' });
    }

    const currentLaptopRes = await db.query(`
      SELECT l.*, u.nombre as anterior_responsable_nombre 
      FROM laptops l
      LEFT JOIN usuarios u ON l.responsable_id = u.id
      WHERE l.id = $1;
    `, [id]);

    if (currentLaptopRes.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop no encontrada.' });
    }

    const currentLaptop = currentLaptopRes.rows[0];

    const newVendorRes = await db.query('SELECT id, nombre FROM usuarios WHERE id = $1', [nuevo_responsable_id]);
    if (newVendorRes.rows.length === 0) {
      return res.status(400).json({ error: 'El vendedor seleccionado no existe.' });
    }
    const newVendor = newVendorRes.rows[0];

    await db.query(`
      UPDATE laptops
      SET responsable_id = $1,
          fecha_asignacion_responsable = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [nuevo_responsable_id, id]);

    // Registrar en auditoría
    await db.query(`
      INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles_json)
      VALUES ($1, 'TRANSFERIR_CUSTODIA_LAPTOP', 'laptops', $2, $3);
    `, [
      reqUserId || null,
      id,
      JSON.stringify({
        laptop: `${currentLaptop.marca} ${currentLaptop.modelo} (${currentLaptop.numero_serie})`,
        responsableAnterior: currentLaptop.anterior_responsable_nombre || 'Sin asignar',
        nuevoResponsable: newVendor.nombre,
        motivo: motivo || 'Reasignación de custodia física por Administrador'
      })
    ]);

    res.json({
      success: true,
      message: `Custodia física de ${currentLaptop.marca} ${currentLaptop.modelo} transferida a ${newVendor.nombre}.`,
      nuevo_responsable_id,
      nuevo_responsable_nombre: newVendor.nombre
    });
  } catch (err) {
    console.error('Error transfiriendo custodia:', err);
    res.status(500).json({ error: 'Error al transferir custodia de la laptop.' });
  }
});

// Reservar laptop por 24 horas (bloquea el stock temporalmente para otros usuarios)
router.post('/:id/reservar', async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nombre, notas, usuario_id } = req.body;

    const reqUserId = usuario_id || req.headers['x-user-id'];
    if (!reqUserId) {
      return res.status(400).json({ error: 'Se requiere identificar al vendedor que realiza la reserva.' });
    }

    // Liberar automáticamente reservas expiradas antes de proceder
    await db.query(`
      UPDATE laptops
      SET estado = 'disponible',
          reservado_por = NULL,
          fecha_reserva = NULL,
          reserva_expira_at = NULL,
          cliente_reserva = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE estado = 'reservada' AND reserva_expira_at IS NOT NULL AND reserva_expira_at < CURRENT_TIMESTAMP;
    `);

    // Consultar laptop actual
    const laptopRes = await db.query(`
      SELECT l.*, u_res.nombre as reservado_por_nombre
      FROM laptops l
      LEFT JOIN usuarios u_res ON l.reservado_por = u_res.id
      WHERE l.id = $1;
    `, [id]);

    if (laptopRes.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop no encontrada.' });
    }

    const laptop = laptopRes.rows[0];

    if (laptop.estado === 'vendida') {
      return res.status(400).json({ error: 'Esta laptop ya ha sido vendida y no se puede reservar.' });
    }

    if (laptop.estado === 'reservada') {
      return res.status(400).json({ 
        error: `Esta laptop ya se encuentra reservada por ${laptop.reservado_por_nombre || 'otro usuario'} hasta ${new Date(laptop.reserva_expira_at).toLocaleString('es-PE')}.` 
      });
    }

    // Obtener datos del usuario que reserva
    const userRes = await db.query('SELECT id, nombre, email, rol FROM usuarios WHERE id = $1', [reqUserId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const reservingUser = userRes.rows[0];

    // Reservar con expiración automática de 24 horas
    const updateRes = await db.query(`
      UPDATE laptops
      SET estado = 'reservada',
          reservado_por = $1,
          fecha_reserva = CURRENT_TIMESTAMP,
          reserva_expira_at = CURRENT_TIMESTAMP + INTERVAL '24 hours',
          cliente_reserva = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `, [
      reservingUser.id,
      cliente_nombre ? cliente_nombre.trim() : null,
      id
    ]);

    // Registrar en auditoría
    await db.query(`
      INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles_json)
      VALUES ($1, 'RESERVAR_LAPTOP_24H', 'laptops', $2, $3);
    `, [
      reservingUser.id,
      id,
      JSON.stringify({
        laptop: `${laptop.marca} ${laptop.modelo} (${laptop.numero_serie})`,
        reservadoPor: reservingUser.nombre,
        cliente: cliente_nombre || 'No especificado',
        expiraEn: '24 horas',
        reserva_expira_at: updateRes.rows[0].reserva_expira_at
      })
    ]);

    // Obtener laptop completa actualizada
    const fullRes = await db.query(`
      SELECT l.*, 
        u_resp.nombre as responsable_nombre,
        u_res.nombre as reservado_por_nombre
      FROM laptops l
      LEFT JOIN usuarios u_resp ON l.responsable_id = u_resp.id
      LEFT JOIN usuarios u_res ON l.reservado_por = u_res.id
      WHERE l.id = $1;
    `, [id]);

    res.json({
      success: true,
      message: `Laptop reservada con éxito por 24 horas para ${reservingUser.nombre}. Stock bloqueado temporalmente.`,
      laptop: fullRes.rows[0]
    });
  } catch (err) {
    console.error('Error al reservar laptop:', err);
    res.status(500).json({ error: 'Error al reservar laptop: ' + err.message });
  }
});

// Cancelar reserva y liberar laptop al inventario disponible
router.post('/:id/cancelar-reserva', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, motivo } = req.body;
    const reqUserId = usuario_id || req.headers['x-user-id'];

    const laptopRes = await db.query(`
      SELECT l.*, u_res.nombre as reservado_por_nombre
      FROM laptops l
      LEFT JOIN usuarios u_res ON l.reservado_por = u_res.id
      WHERE l.id = $1;
    `, [id]);

    if (laptopRes.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop no encontrada.' });
    }

    const laptop = laptopRes.rows[0];
    if (laptop.estado !== 'reservada') {
      return res.status(400).json({ error: 'La laptop no se encuentra en estado reservada.' });
    }

    // RBAC: Solo quien reservó o un administrador pueden cancelarla
    let canCancel = false;
    if (reqUserId) {
      const uRes = await db.query('SELECT id, nombre, rol FROM usuarios WHERE id = $1', [reqUserId]);
      if (uRes.rows.length > 0) {
        const u = uRes.rows[0];
        if (u.rol === 'admin' || u.id === laptop.reservado_por) {
          canCancel = true;
        }
      }
    }
    if (req.headers['x-user-role'] === 'admin') {
      canCancel = true;
    }

    if (!canCancel) {
      return res.status(403).json({ 
        error: `Permiso denegado. Esta laptop fue reservada por ${laptop.reservado_por_nombre || 'otro vendedor'}. Solo ese vendedor o el Administrador pueden liberarla.` 
      });
    }

    await db.query(`
      UPDATE laptops
      SET estado = 'disponible',
          reservado_por = NULL,
          fecha_reserva = NULL,
          reserva_expira_at = NULL,
          cliente_reserva = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [id]);

    // Registrar en auditoría
    await db.query(`
      INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles_json)
      VALUES ($1, 'CANCELAR_RESERVA_LAPTOP', 'laptops', $2, $3);
    `, [
      reqUserId || null,
      id,
      JSON.stringify({
        laptop: `${laptop.marca} ${laptop.modelo} (${laptop.numero_serie})`,
        motivo: motivo || 'Cancelación manual de reserva'
      })
    ]);

    const fullRes = await db.query(`
      SELECT l.*, 
        u_resp.nombre as responsable_nombre
      FROM laptops l
      LEFT JOIN usuarios u_resp ON l.responsable_id = u_resp.id
      WHERE l.id = $1;
    `, [id]);

    res.json({
      success: true,
      message: `Reserva cancelada. La laptop ${laptop.marca} ${laptop.modelo} vuelve a estar disponible para venta.`,
      laptop: fullRes.rows[0]
    });
  } catch (err) {
    console.error('Error al cancelar reserva:', err);
    res.status(500).json({ error: 'Error al cancelar reserva: ' + err.message });
  }
});

// Eliminar laptop (solo si no tiene ventas asociadas)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const salesCheck = await db.query('SELECT id FROM ventas WHERE laptop_id = $1 LIMIT 1', [id]);
    if (salesCheck.rows.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una laptop que tiene ventas registradas en el historial.' });
    }

    await db.query('DELETE FROM laptops WHERE id = $1', [id]);
    res.json({ success: true, message: 'Laptop eliminada del catálogo.' });
  } catch (err) {
    console.error('Error eliminando laptop:', err);
    res.status(500).json({ error: 'Error al eliminar laptop.' });
  }
});

module.exports = router;
