import React from 'react';
import { Laptop, ShieldCheck, UserCheck, Calendar, Bell, Menu, LogOut } from 'lucide-react';
import { getMonthName } from '../utils/formatters';

export default function Navbar({ 
  currentUser, 
  onLogout,
  currentMonth, 
  onChangeMonth, 
  onToggleSidebar,
  motivationAlert 
}) {
  const isAdmin = currentUser?.rol === 'admin';

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Lado Izquierdo: Botón Menú Móvil y Logo */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            title="Abrir Menú"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Laptop<span className="text-blue-400">PRO</span></span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  ERP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Gestión Comercial & Rentabilidad</p>
            </div>
          </div>
        </div>

        {/* Lado Central / Alerta Rápida si existe */}
        {motivationAlert && (
          <div className="hidden lg:flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs text-amber-300 animate-pulse">
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium truncate max-w-md">{motivationAlert.title}: {motivationAlert.message}</span>
          </div>
        )}

        {/* Lado Derecho: Selector de Mes & Perfil Autenticado con Botón de Salir */}
        <div className="flex items-center space-x-3">
          
          {/* Selector de Mes */}
          <div className="relative flex items-center bg-slate-800 rounded-xl px-2.5 py-1.5 border border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <input 
              type="month" 
              value={currentMonth} 
              onChange={(e) => onChangeMonth(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            />
          </div>

          {/* Tarjeta de Usuario Autenticado */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 pl-2.5 space-x-2.5">
            <div className={`p-1.5 rounded-lg ${isAdmin ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {isAdmin ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
            </div>

            <div className="text-left hidden sm:block pr-1">
              <p className="text-xs font-bold text-white truncate max-w-[140px] leading-tight">
                {currentUser?.nombre}
              </p>
              <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded mt-0.5 ${
                isAdmin ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {isAdmin ? 'ADMINISTRADOR' : 'VENDEDOR'}
              </span>
            </div>

            {/* Botón Cerrar Sesión */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors flex items-center space-x-1"
                title="Cerrar Sesión Segura"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-[11px] font-semibold text-slate-300 hidden md:inline">Salir</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
