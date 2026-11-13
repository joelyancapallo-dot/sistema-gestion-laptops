const jwt = require('jsonwebtoken');

// En producción la clave tiene que venir del entorno: la de ejemplo está
// publicada en el repositorio y con ella cualquiera podría fabricar tokens.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('Falta JWT_SECRET: en producción no se usa la clave de ejemplo.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_tienda_laptops_2026';

/**
 * Middleware para validar el token JWT y autenticar al usuario.
 * La identidad sale SOLO del token verificado: nunca de cabeceras o campos
 * que mande el navegador, porque cualquiera puede falsificarlos.
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
    return res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión con tus credenciales.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    // La web también manda x-user-id / x-user-role / x-user-name. Se
    // reemplazan por los del token para el código que todavía las lee.
    req.headers['x-user-id'] = String(decoded.id);
    req.headers['x-user-role'] = decoded.rol;
    req.headers['x-user-name'] = decoded.nombre || '';
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
