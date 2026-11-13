const express = require('express');
const router = express.Router();
const SalesService = require('../services/salesService');

// Listar ventas con filtros
router.get('/', async (req, res) => {
  try {
    const { vendedor_id, responsable_id, monthYear, periodo, estado, condicion, search, limit, offset } = req.query;
    const sales = await SalesService.getSales({
      vendedor_id,
      responsable_id,
      monthYear: monthYear || periodo,
      estado,
      condicion,
      search,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json(sales);
  } catch (err) {
    console.error('Error consultando ventas:', err);
    res.status(500).json({ error: 'Error al consultar ventas.' });
  }
});

// Registrar nueva venta (RESTRINGIDO EXCLUSIVAMENTE AL PERFIL DE ADMINISTRADOR)
router.post('/', async (req, res) => {
  try {
    // Quién pide la venta: solo el usuario del token (no campos del navegador)
    const requestingUserId = req.user.id;
    let userRole = req.user.rol;

    const db = require('../db');
    if (requestingUserId) {
      const uRes = await db.query('SELECT rol FROM usuarios WHERE id = $1', [requestingUserId]);
      if (uRes.rows.length > 0) {
        userRole = uRes.rows[0].rol;
      }
    }

    // Control de acceso RBAC: Solo perfil Administrador puede registrar ventas
    if (userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Permiso denegado. La función de registrar ventas está restringida exclusivamente para el perfil de Administrador. El vendedor cuenta con permisos de solo lectura.' 
      });
    }

    const currentUser = {
      id: parseInt(requestingUserId || '1', 10),
      rol: 'admin'
    };

    const sale = await SalesService.registerSale(req.body, currentUser);
    res.status(201).json(sale);
  } catch (err) {
    console.error('Error registrando venta:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Función común para cambiar estado de una venta (soporta PUT y PATCH)
const handleStatusUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const newStatus = req.body.newStatus || req.body.estado || req.body.nuevoEstado;
    const reason = req.body.reason || req.body.motivo;

    if (!newStatus) {
      return res.status(400).json({ error: 'El nuevo estado es requerido.' });
    }

    const currentUser = { id: req.user.id, rol: req.user.rol };

    const result = await SalesService.updateSaleStatus(id, newStatus, reason, currentUser);
    res.json(result);
  } catch (err) {
    console.error('Error actualizando estado de venta:', err.message);
    res.status(400).json({ error: err.message });
  }
};

router.put('/:id/status', handleStatusUpdate);
router.patch('/:id/status', handleStatusUpdate);

// Eliminar venta permanentemente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = { id: req.user.id, rol: req.user.rol };

    const result = await SalesService.deleteSale(id, currentUser);
    res.json(result);
  } catch (err) {
    console.error('Error eliminando venta:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
