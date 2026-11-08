/**
 * Utilidades de Autenticación JWT y Configuración de Interceptor Global
 */

// Decodificar payload de token JWT sin dependencias externas
export function decodeJwt(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn('Error decodificando JWT:', err);
    return null;
  }
}

// Verificar si el token está expirado
export function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;
  // Margen de seguridad de 10 segundos
  return (payload.exp * 1000) < (Date.now() + 10000);
}

// Inicializar interceptor global de fetch para inyectar automáticamente el Bearer token
export function setupAuthInterceptor(onUnauthorized) {
  if (window._authInterceptorInstalled) return;
  window._authInterceptorInstalled = true;

  const originalFetch = window.fetch;
  window.fetch = async function (resource, config = {}) {
    let url = typeof resource === 'string' ? resource : (resource?.url || '');
    
    // Solo interceptar peticiones a la API del backend
    if (url.startsWith('/api') && !url.includes('/api/auth/login')) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config = config || {};
        
        // Manejar diferentes formatos de headers
        if (config.headers instanceof Headers) {
          if (!config.headers.has('Authorization')) {
            config.headers.set('Authorization', `Bearer ${token}`);
          }
        } else if (Array.isArray(config.headers)) {
          config.headers.push(['Authorization', `Bearer ${token}`]);
        } else {
          config.headers = {
            ...(config.headers || {}),
            Authorization: `Bearer ${token}`
          };
        }
      }
    }

    try {
      const response = await originalFetch.call(this, resource, config);
      
      // Si el servidor responde 401 Unauthorized y no es el endpoint de login
      if (response.status === 401 && !url.includes('/api/auth/login')) {
        console.warn('Sesión no autorizada o token JWT expirado.');
        if (onUnauthorized) {
          onUnauthorized();
        }
      }
      
      return response;
    } catch (err) {
      throw err;
    }
  };
}
