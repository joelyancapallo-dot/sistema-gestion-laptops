import React, { useState } from 'react';
import { 
  Laptop, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight,
  KeyRound
} from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!identificador.trim() || !password) {
      setErrorMessage('Por favor ingresa tu usuario o correo y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const trimmed = identificador.trim();
      let emailPayload = trimmed.toLowerCase();
      // Mapeo amigable para permitir login por nombre o email
      if (emailPayload === 'fer') emailPayload = 'roslinchoque@tiendalaptops.pe';
      if (emailPayload === 'cristofer') emailPayload = 'cristofer@tiendalaptops.pe';
      if (emailPayload === 'roberto') emailPayload = 'roberto@tiendalaptops.pe';
      if (emailPayload === 'admin') emailPayload = 'admin@tiendalaptops.pe';

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identificador: emailPayload,
          email: emailPayload,
          username: emailPayload,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
      }

      // Guardar token JWT y datos de sesión
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
      } else {
        throw new Error('Respuesta inválida del servidor (sin token JWT).');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 antialiased">
      
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        
        {/* Cabecera / Logo del ERP */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/20 mb-4 border border-blue-400/30">
            <Laptop className="w-8 h-8" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Laptop<span className="text-blue-400">PRO</span>
            </h1>
            <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              ERP
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestión Comercial, Comisiones & Control de Rentabilidad
          </p>
        </div>

        {/* Tarjeta de Formulario de Acceso */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 text-slate-200">
          
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-blue-400" />
              <span>Iniciar Sesión</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Acceso seguro con token JWT según tu rol de usuario.
            </p>
          </div>

          {/* Mensaje de Error */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo: Usuario / Correo */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Usuario o Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="admin@tiendalaptops.pe o tu nombre"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Campo: Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón de Envío */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Autenticación JWT & Control de Acceso Basado en Roles (RBAC) &copy; 2026
        </p>

      </div>
    </div>
  );
}
