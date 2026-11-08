const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/authMiddleware');

// Iniciar sesión con email o nombre de usuario y contraseña (Genera JWT)
router.post('/login', async (req, res) => {
  try {
    const { email, username, identificador, password } = req.body;
    let loginUser = (email || identificador || username || '').toLowerCase().trim();

    if (!loginUser || !password) {
      return res.status(400).json({ error: 'Ingresa tu usuario o correo electrónico y contraseña.' });
    }

    // Soporte para alias amigables
    if (loginUser === 'admin' || loginUser === 'administrador' || loginUser === 'propietario') {
      loginUser = 'admin@tiendalaptops.pe';
    } else if (loginUser === 'fer') {
      loginUser = 'roslinchoque@tiendalaptops.pe';
    }

    const userRes = await db.query(`
      SELECT * FROM usuarios 
      WHERE (
        LOWER(email) = $1 
        OR LOWER(nombre) = $1
        OR (rol = 'admin' AND ($1 = 'admin@tiendalaptops.pe' OR $1 = 'admin' OR $1 = 'administrador'))
      ) AND activo = TRUE
      LIMIT 1;
    `, [loginUser]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o cuenta inactiva.' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta. Verifica tus credenciales.' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        nombre: user.nombre, 
        email: user.email, 
        rol: user.rol 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono,
        meta_mensual_unidades: user.meta_mensual_unidades
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno en el servidor.' });
  }
});

// Obtener información del usuario autenticado actual desde el token JWT
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userRes = await db.query(`
      SELECT id, nombre, email, rol, telefono, activo, meta_mensual_unidades, created_at, created_at as fecha_ingreso
      FROM usuarios 
      WHERE id = $1 AND activo = TRUE;
    `, [req.user.id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado o dado de baja.' });
    }

    res.json(userRes.rows[0]);
  } catch (err) {
    console.error('Error en /me:', err);
    res.status(500).json({ error: 'Error al verificar sesión actual.' });
  }
});

// Listar todos los usuarios del sistema (Admin + Vendedores)
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, nombre, email, rol, telefono, activo, meta_mensual_unidades, created_at, created_at as fecha_ingreso 
      FROM usuarios 
      ORDER BY rol ASC, nombre ASC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error al consultar usuarios.' });
  }
});

// Registrar nuevo usuario (Vendedor o Admin)
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, telefono, rol = 'vendedor', meta_mensual_unidades = 25 } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
    }

    const existing = await db.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico.' });
    }

    const passHash = await bcrypt.hash(password, 10);
    const insertRes = await db.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, meta_mensual_unidades, activo)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING id, nombre, email, rol, telefono, meta_mensual_unidades, activo, created_at;
    `, [nombre.trim(), email.toLowerCase().trim(), passHash, rol, telefono || null, meta_mensual_unidades]);

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error('Error registrando usuario:', err);
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

// Actualizar usuario general por ID
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, telefono, rol, meta_mensual_unidades, activo } = req.body;

    let updateQuery = `
      UPDATE usuarios 
      SET nombre = COALESCE($1, nombre),
          email = COALESCE($2, email),
          telefono = COALESCE($3, telefono),
          rol = COALESCE($4, rol),
          meta_mensual_unidades = COALESCE($5, meta_mensual_unidades),
          activo = COALESCE($6, activo),
          updated_at = CURRENT_TIMESTAMP
    `;
    const params = [nombre, email ? email.toLowerCase().trim() : null, telefono, rol, meta_mensual_unidades, activo];

    if (password && password.trim().length > 0) {
      const hash = await bcrypt.hash(password, 10);
      updateQuery += `, password_hash = $7 WHERE id = $8 RETURNING id, nombre, email, rol, telefono, meta_mensual_unidades, activo;`;
      params.push(hash, id);
    } else {
      updateQuery += ` WHERE id = $7 RETURNING id, nombre, email, rol, telefono, meta_mensual_unidades, activo;`;
      params.push(id);
    }

    const result = await db.query(updateQuery, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
});

// Listar todos los vendedores (Ilimitados)
router.get('/vendors', async (req, res) => {
  try {
    const { soloActivos } = req.query;
    let query = `SELECT id, nombre, email, rol, telefono, activo, meta_mensual_unidades, created_at FROM usuarios WHERE rol = 'vendedor'`;
    if (soloActivos === 'true') {
      query += ` AND activo = TRUE`;
    }
    query += ` ORDER BY nombre ASC;`;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando vendedores:', err);
    res.status(500).json({ error: 'Error al consultar vendedores.' });
  }
});

// Registrar nuevo vendedor
router.post('/vendors', async (req, res) => {
  try {
    const { nombre, email, password, telefono, meta_mensual_unidades = 25 } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
    }

    const existing = await db.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico.' });
    }

    const passHash = await bcrypt.hash(password, 10);
    const insertRes = await db.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, meta_mensual_unidades, activo)
      VALUES ($1, $2, $3, 'vendedor', $4, $5, TRUE)
      RETURNING id, nombre, email, rol, telefono, meta_mensual_unidades, activo, created_at;
    `, [nombre.trim(), email.toLowerCase().trim(), passHash, telefono || null, meta_mensual_unidades]);

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error('Error creando vendedor:', err);
    res.status(500).json({ error: 'Error al registrar vendedor.' });
  }
});

// Editar vendedor
router.put('/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, telefono, meta_mensual_unidades, activo } = req.body;

    let updateQuery = `
      UPDATE usuarios 
      SET nombre = COALESCE($1, nombre),
          email = COALESCE($2, email),
          telefono = COALESCE($3, telefono),
          meta_mensual_unidades = COALESCE($4, meta_mensual_unidades),
          activo = COALESCE($5, activo),
          updated_at = CURRENT_TIMESTAMP
    `;
    const params = [nombre, email ? email.toLowerCase().trim() : null, telefono, meta_mensual_unidades, activo];

    if (password && password.trim().length > 0) {
      const hash = await bcrypt.hash(password, 10);
      updateQuery += `, password_hash = $6 WHERE id = $7 RETURNING id, nombre, email, rol, telefono, meta_mensual_unidades, activo;`;
      params.push(hash, id);
    } else {
      updateQuery += ` WHERE id = $6 RETURNING id, nombre, email, rol, telefono, meta_mensual_unidades, activo;`;
      params.push(id);
    }

    const result = await db.query(updateQuery, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendedor no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando vendedor:', err);
    res.status(500).json({ error: 'Error al actualizar vendedor.' });
  }
});

// Activar/Desactivar vendedor
router.patch('/vendors/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      UPDATE usuarios 
      SET activo = NOT activo, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND rol = 'vendedor'
      RETURNING id, nombre, email, activo;
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendedor no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error alternando estado de vendedor:', err);
    res.status(500).json({ error: 'Error al cambiar estado de vendedor.' });
  }
});

module.exports = router;
