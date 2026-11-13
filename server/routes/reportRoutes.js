const express = require('express');
const router = express.Router();
const db = require('../db');
const ReportService = require('../services/reportService');

// Indicadores del Dashboard Principal
router.get('/dashboard', async (req, res) => {
  try {
    const monthYear = req.query.periodo || req.query.monthYear;
    const metrics = await ReportService.getDashboardMetrics(monthYear);
    res.json(metrics);
  } catch (err) {
    console.error('Error calculando métricas del dashboard:', err);
    res.status(500).json({ error: 'Error al calcular indicadores del dashboard.' });
  }
});

// Ranking mensual de vendedores con podio
router.get('/ranking', async (req, res) => {
  try {
    const monthYear = req.query.periodo || req.query.monthYear;
    const ranking = await ReportService.getVendorRanking(monthYear);
    res.json(ranking);
  } catch (err) {
    console.error('Error calculando ranking de vendedores:', err);
    res.status(500).json({ error: 'Error al calcular ranking de vendedores.' });
  }
});

// Estado de Resultados y Rentabilidad Real (con Simulador Distribuidor)
router.get('/profitability', async (req, res) => {
  try {
    const monthYear = req.query.periodo || req.query.monthYear;
    const analysis = await ReportService.getProfitabilityAnalysis(monthYear);
    res.json(analysis);
  } catch (err) {
    console.error('Error calculando análisis de rentabilidad:', err);
    res.status(500).json({ error: 'Error al calcular análisis de rentabilidad.' });
  }
});

// Informe Ejecutivo Mensual (Sección 10 del Requerimiento)
router.get('/monthly', async (req, res) => {
  try {
    const periodo = req.query.periodo || req.query.monthYear;
    const report = await ReportService.getMonthlyExecutiveReport(periodo);
    res.json(report);
  } catch (err) {
    console.error('Error generando reporte mensual:', err);
    res.status(500).json({ error: 'Error al generar informe mensual.' });
  }
});

// Gastos operativos del negocio (listar y registrar)
router.get('/expenses', async (req, res) => {
  try {
    const { monthYear } = req.query;
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);
    const result = await db.query(`
      SELECT g.*, u.nombre as registrado_por_nombre 
      FROM gastos_operativos g
      LEFT JOIN usuarios u ON g.registrado_por = u.id
      WHERE TO_CHAR(g.fecha, 'YYYY-MM') = $1
      ORDER BY g.fecha DESC;
    `, [targetMonth]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error consultando gastos:', err);
    res.status(500).json({ error: 'Error al consultar gastos operativos.' });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const { fecha, concepto, categoria, monto } = req.body;
    const registrado_por = req.user.id; // quien registra: el usuario del token
    if (!concepto || !categoria || !monto) {
      return res.status(400).json({ error: 'Concepto, categoría y monto son obligatorios.' });
    }

    const insertRes = await db.query(`
      INSERT INTO gastos_operativos (fecha, concepto, categoria, monto, registrado_por)
      VALUES (COALESCE($1, CURRENT_DATE), $2, $3, $4, $5)
      RETURNING *;
    `, [fecha || null, concepto.trim(), categoria, parseFloat(monto), registrado_por || 1]);

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error('Error registrando gasto:', err);
    res.status(500).json({ error: 'Error al registrar gasto operativo.' });
  }
});

// Registro de Auditoría
router.get('/audit', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await db.query(`
      SELECT a.*, u.nombre as usuario_nombre, u.email as usuario_email 
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      ORDER BY a.created_at DESC
      LIMIT $1;
    `, [parseInt(limit, 10)]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error consultando auditoría:', err);
    res.status(500).json({ error: 'Error al consultar registros de auditoría.' });
  }
});

module.exports = router;
