import React from 'react';
import { 
  LayoutDashboard, 
  UserCheck, 
  ShoppingCart, 
  Laptop, 
  Trophy, 
  TrendingUp, 
  Sliders, 
  Users, 
  FileText, 
  ShieldAlert,
  Sparkles,
  X,
  LogOut
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  onSelectTab, 
  currentUser, 
  isOpen, 
  onClose,
  vendorMetrics,
  onLogout 
}) {
  const isAdmin = currentUser?.rol === 'admin';

  const navItems = [
    // Elementos para Administrador
    ...(isAdmin ? [
      { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard, badge: null }
    ] : []),

    // Vista individual del vendedor
    { 
      id: 'mi-portal', 
      label: isAdmin ? 'Vista Vendedor (Simular)' : 'Mis Ventas y Comisiones', 
      icon: UserCheck, 
      highlight: !isAdmin 
    },

    // Operaciones
    { id: 'ventas', label: 'Registro de Ventas', icon: ShoppingCart },
    { id: 'catalogo', label: 'Catálogo de Laptops', icon: Laptop },
    { id: 'ranking', label: 'Ranking Comercial', icon: Trophy },

    // Administración y Rentabilidad (Solo Admin)
    ...(isAdmin ? [
      { id: 'rentabilidad', label: 'Control de Rentabilidad', icon: TrendingUp },
      { id: 'comisiones', label: 'Reglas y Cierre Mensual', icon: Sliders },
      { id: 'vendedores', label: 'Gestión de Vendedores', icon: Users },
      { id: 'reportes', label: 'Informes Mensuales', icon: FileText },
      { id: 'auditoria', label: 'Auditoría y Seguridad', icon: ShieldAlert },
    ] : []),
  ];

  return (
    <>
      {/* Backdrop para móviles */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-slate-200 flex flex-col justify-between
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        transition-transform duration-200 ease-in-out shadow-lg md:shadow-none no-print
      `}>
        <div className="p-4 flex flex-col h-full overflow-y-auto">
          
          {/* Header móvil para cerrar */}
          <div className="flex items-center justify-between md:hidden pb-3 mb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800 text-sm">Menú de Navegación</span>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tarjeta de Perfil en la barra lateral */}
          <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${isAdmin ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {currentUser.nombre.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-xs text-slate-900 truncate">{currentUser.nombre}</p>
                <span className={`inline-block text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {isAdmin ? 'Administrador' : 'Vendedor Comercial'}
                </span>
              </div>
            </div>

            {/* Widget de progreso si es vendedor */}
            {!isAdmin && vendorMetrics && (
              <div className="mt-3 pt-2.5 border-t border-slate-200 text-xs">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-slate-500 font-medium">Laptops este mes:</span>
                  <span className="font-bold text-slate-800">{vendorMetrics.totalUnits} u.</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (vendorMetrics.totalUnits / 21) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {vendorMetrics.totalUnits >= 21 
                    ? '🎉 ¡Comisión retroactiva S/ 50 activa!' 
                    : `Faltan ${21 - vendorMetrics.totalUnits} para S/ 50 retroactivo`}
                </p>
              </div>
            )}
          </div>

          {/* Menú de Enlaces */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Navegación
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold
                    transition-all duration-150 text-left
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'}
                    ${item.highlight && !isActive ? 'border border-emerald-200 bg-emerald-50/50 text-emerald-800' : ''}
                  `}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </button>
              );
            })}
          </nav>

        </div>

        {/* Footer de la barra lateral con Cerrar Sesión */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          )}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-slate-600">Docker PostgreSQL</span>
            </span>
            <span className="font-semibold text-slate-500">v1.0.0</span>
          </div>
        </div>

      </aside>
    </>
  );
}
