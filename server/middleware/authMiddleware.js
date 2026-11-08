const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_tienda_laptops_2026';

/**
 * Middleware para validar el token JWT y autenticar al usuario
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }

  if (!token) {
    // Modo de retrocompatibilidad si se envían encabezados antiguos
    if (req.headers['x-user-role']) {
      req.user = {
        id: parseInt(req.headers['x-user-id'] || '1', 10),
        rol: req.headers['x-user-role'],
        nombre: req.headers['x-user-name'] || 'Usuario'
      };
      return next();
    }
    return res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión con tus credenciales.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.warn('[JWT Auth] Token inválido o expirado:', err.message);
    return res.status(401).json({ error: 'Sesión expirada o token inválido. Por favor inicia sesión nuevamente.' });
  }
}

/**
 * Middleware para verificar roles requeridos (ej: requireRole('admin'))
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }
    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ 
        error: `Acceso restringido. Esta acción requiere permisos de: ${allowedRoles.join(', ')}.` 
      });
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole,
  JWT_SECRET
};
