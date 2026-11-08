const express = require('express');
const router = express.Router();
const db = require('../db');
const CommissionService = require('../services/commissionService');

// Consultar escala de comisiones activa
router.get('/rules', async (req, res) => {
  try {
    const rules = await CommissionService.getActiveRules();
    res.json(rules);
  } catch (err) {
    console.error('Error consultando reglas de comisión:', err);
    res.status(500).json({ error: 'Error al consultar reglas de comisión.' });
  }
});

// Actualizar o crear escala de comisiones (Solo Admin)
router.post('/rules', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const tiers = req.body.tiers || req.body.rules; // Soporta tiers o rules

    if (!Array.isArray(tiers) || tiers.length === 0) {
      return res.status(400).json({ error: 'Se debe proporcionar al menos un nivel en la escala de comisiones.' });
    }

    // Desactivar reglas anteriores (para mantener historial)
    await client.query(`UPDATE reglas_comision SET activo = FALSE;`);

    // Insertar nuevas reglas
    let order = 1;
    for (const t of tiers) {
      const amount = parseFloat(t.monto_por_unidad || t.monto_comision || 0);
      const maxRange = t.rango_max ? parseInt(t.rango_max, 10) : 9999;
      await client.query(`
        INSERT INTO reglas_comision (nombre_escala, rango_min, rango_max, monto_por_unidad, es_retroactivo, orden, activo)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE);
      `, [
        t.nombre_escala || `Nivel ${order}`,
        parseInt(t.rango_min, 10),
        maxRange,
        amount,
        Boolean(t.es_retroactivo),
        order++
      ]);
    }

    // Registrar en auditoría
    await client.query(`
      INSERT INTO auditoria (usuario_id, accion, entidad, detalles_json)
      VALUES ($1, 'ACTUALIZAR_ESCALA_COMISIONES', 'reglas_comision', $2);
    `, [req.body.usuario_id || 1, JSON.stringify(tiers)]);

    await client.query('COMMIT');

    const updatedRules = await CommissionService.getActiveRules();
    res.json({ success: true, message: 'Escala de comisiones actualizada exitosamente.', rules: updatedRules });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error guardando reglas de comisión:', err);
    res.status(500).json({ error: 'Error al guardar la nueva escala de comisiones.' });
  } finally {
    client.release();
  }
});

// Obtener métricas y progreso individual de un vendedor
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { monthYear } = req.query;

    const vendorRes = await db.query('SELECT id, nombre, email, telefono FROM usuarios WHERE id = $1', [vendorId]);
    if (vendorRes.rows.length === 0) {
      return res.status(404).json({ error: 'Vendedor no encontrado.' });
    }

    const metrics = await CommissionService.getVendorMonthlyMetrics(vendorId, monthYear);
    res.json({
      vendedor: vendorRes.rows[0],
      ...metrics
    });
  } catch (err) {
    console.error('Error consultando métricas de vendedor:', err);
    res.status(500).json({ error: 'Error al consultar métricas del vendedor.' });
  }
});

// Cerrar y liquidar periodo mensual (Congelamiento histórico)
router.post('/close-period', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { monthYear, cerrado_por } = req.body;
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);

    // Verificar si ya está cerrado
    const checkRes = await client.query('SELECT * FROM periodos_cierre WHERE mes_anio = $1', [targetMonth]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: `El periodo ${targetMonth} ya ha sido cerrado y liquidado previamente.` });
    }

    // Obtener reglas activas actuales para el snapshot histórico
    const activeRules = await CommissionService.getActiveRules(client);

    // Obtener vendedores activos y calcular liquidación individual
    const vendorsRes = await client.query(`SELECT id, nombre, email FROM usuarios WHERE rol = 'vendedor'`);
    const liquidaciones = [];
    let totalLaptops = 0;
    let totalVentas = 0;
    let totalComisiones = 0;
    let totalDiferencias = 0;
    let totalGananciaBase = 0;

    for (const v of vendorsRes.rows) {
      const vMetrics = await CommissionService.getVendorMonthlyMetrics(v.id, targetMonth, client);
      liquidaciones.push({
        vendedorId: v.id,
        nombre: v.nombre,
        laptopsVendidas: vMetrics.totalUnits,
        totalVendido: vMetrics.totalSalesAmount,
        comisionLiquidada: vMetrics.totalCommission,
        diferenciasNegociacion: vMetrics.totalNegotiationDiff,
        totalLiquidado: vMetrics.totalVendorIncome,
        tarifaAplicada: vMetrics.currentRatePerUnit
      });

      totalLaptops += vMetrics.totalUnits;
      totalVentas += vMetrics.totalSalesAmount;
      totalComisiones += vMetrics.totalCommission;
      totalDiferencias += vMetrics.totalNegotiationDiff;
      totalGananciaBase += vMetrics.totalBusinessBaseProfit;
    }

    // Gastos operativos del mes
    const gastosRes = await client.query(`
      SELECT COALESCE(SUM(monto), 0) as total_gastos 
      FROM gastos_operativos 
      WHERE TO_CHAR(fecha, 'YYYY-MM') = $1;
    `, [targetMonth]);

    const gastosOperativos = parseFloat(gastosRes.rows[0].total_gastos || 0);
    const gananciaNeta = Math.round((totalGananciaBase - totalComisiones - gastosOperativos) * 100) / 100;

    // Guardar cierre con snapshot JSON inmutable
    const insertRes = await client.query(`
      INSERT INTO periodos_cierre (
        mes_anio, total_laptops, total_ventas, total_comisiones,
        total_diferencias, ganancia_neta, gastos_operativos,
        reglas_snapshot_json, liquidaciones_vendedores_json, cerrado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `, [
      targetMonth,
      totalLaptops,
      totalVentas,
      totalComisiones,
      totalDiferencias,
      gananciaNeta,
      gastosOperativos,
      JSON.stringify(activeRules),
      JSON.stringify(liquidaciones),
      cerrado_por || 1
    ]);

    // Auditoría
    await client.query(`
      INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles_json)
      VALUES ($1, 'CIERRE_PERIODO_MENSUAL', 'periodos_cierre', $2, $3);
    `, [
      cerrado_por || 1,
      insertRes.rows[0].id,
      JSON.stringify({ mes: targetMonth, totalLaptops, totalComisiones, gananciaNeta })
    ]);

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Periodo ${targetMonth} cerrado y liquidado exitosamente.`,
      periodo: insertRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error cerrando periodo:', err);
    res.status(500).json({ error: 'Error al liquidar periodo mensual.' });
  } finally {
    client.release();
  }
});

// Listar periodos cerrados históricamente
router.get('/periods', async (req, res) => {
  try {
    const resPeriods = await db.query(`
      SELECT p.*, u.nombre as cerrado_por_nombre 
      FROM periodos_cierre p
      LEFT JOIN usuarios u ON p.cerrado_por = u.id
      ORDER BY p.mes_anio DESC;
    `);
    res.json(resPeriods.rows);
  } catch (err) {
    console.error('Error consultando periodos cerrados:', err);
    res.status(500).json({ error: 'Error al consultar periodos históricos.' });
  }
});

module.exports = router;
