import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import LoginView from './views/LoginView';
import { decodeJwt, isTokenExpired, setupAuthInterceptor } from './utils/apiAuth';

// Vistas del Sistema
import DashboardView from './views/DashboardView';
import VendorPortalView from './views/VendorPortalView';
import SalesView from './views/SalesView';
import CatalogView from './views/CatalogView';
import RankingView from './views/RankingView';
import ProfitabilityView from './views/ProfitabilityView';
import { CommissionRulesView } from './views/CommissionRulesView';
import { VendorsAdminView } from './views/VendorsAdminView';
import { MonthlyReportView } from './views/MonthlyReportView';
import { AuditView } from './views/AuditView';
import PublicCatalogView from './views/PublicCatalogView';
import PublicCatalogAdminView from './views/PublicCatalogAdminView';

export function App() {
  // Token JWT y Usuario autenticado en sesión
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch (_) {}
    }
    const token = localStorage.getItem('auth_token');
    if (token && !isTokenExpired(token)) {
      return decodeJwt(token);
    }
    return null;
  });

  const [usersList, setUsersList] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Periodo seleccionado (Formato YYYY-MM, ej: '2026-11')
  const [currentMonth, setCurrentMonth] = useState('2026-11');

  // Pestaña activa de navegación
  const [activeTab, setActiveTab] = useState(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        return u.rol === 'vendedor' ? 'mi-portal' : 'dashboard';
      } catch (_) {}
    }
    return 'dashboard';
  });

  // Vendedor inspeccionado (cuando el admin visita el portal de un vendedor específico)
  const [inspectedVendorId, setInspectedVendorId] = useState(null);

  // Abrir modal de nueva venta automáticamente
  const [openNewSaleModal, setOpenNewSaleModal] = useState(false);

  // Estado del menú lateral en dispositivos móviles
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPublicRoute, setIsPublicRoute] = useState(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    return path.startsWith('/catalogo') || path.startsWith('/catalog');
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      setIsPublicRoute(path.startsWith('/catalogo') || path.startsWith('/catalog'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Estados de datos sincronizados con la Base de Datos PostgreSQL
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [rankingData, setRankingData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [sales, setSales] = useState([]);
  const [laptops, setLaptops] = useState([]);
  const [vendorMetrics, setVendorMetrics] = useState(null);

  // Vendedor efectivo para el portal individual
  const effectiveVendor = inspectedVendorId 
    ? usersList.find(u => u.id === inspectedVendorId) || currentUser 
    : currentUser;

  // Manejador de cierre de sesión (Logout)
  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthToken(null);
    setCurrentUser(null);
    setDashboardMetrics(null);
    setRankingData(null);
    setProfitData(null);
    setExpenses([]);
    setSales([]);
    setLaptops([]);
    setVendorMetrics(null);
    setInspectedVendorId(null);
    setActiveTab('dashboard');
  }, []);

  // Manejador de inicio de sesión exitoso (Login)
  const handleLoginSuccess = (user, token) => {
    setAuthToken(token);
    setCurrentUser(user);
    if (user.rol === 'vendedor') {
      setActiveTab('mi-portal');
      setInspectedVendorId(user.id);
    } else {
      setActiveTab('dashboard');
      setInspectedVendorId(null);
    }
  };

  // 1. Carga inicial de usuarios
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsersList(data);
        }
      }
    } catch (err) {
      console.warn('Error listando usuarios:', err);
    }
  };

  // 2. Cargar datos del periodo y usuario activo de manera segura
  const refreshAllData = useCallback(async () => {
    if (!currentUser) return;

    try {
      const safeFetch = (url, fallback) => 
        fetch(url)
          .then(r => r.ok ? r.json() : fallback)
          .catch(() => fallback);

      // Peticiones en paralelo con protección contra fallos individuales
      const promises = [
        safeFetch(`/api/reports/dashboard?periodo=${currentMonth}`, null),
        safeFetch(`/api/reports/ranking?periodo=${currentMonth}`, []),
        safeFetch(`/api/reports/profitability?periodo=${currentMonth}`, null),
        safeFetch(`/api/reports/expenses?periodo=${currentMonth}`, []),
        safeFetch(`/api/sales?periodo=${currentMonth}`, []),
        safeFetch('/api/laptops', [])
      ];

      // Si hay un vendedor a evaluar (o usuario es vendedor)
      const targetVendorId = inspectedVendorId || (currentUser?.rol === 'vendedor' ? currentUser.id : null);
      if (targetVendorId) {
        promises.push(
          safeFetch(`/api/commissions/vendor/${targetVendorId}?periodo=${currentMonth}`, null)
        );
      }

      const results = await Promise.all(promises);
      const [dash, rank, profit, exp, vtas, lapt, vendMet] = results;

      if (dash && !dash.error) setDashboardMetrics(dash);

      if (rank) {
        const rankingArr = Array.isArray(rank) ? rank : (rank.ranking || []);
        setRankingData({
          monthYear: currentMonth,
          ranking: rankingArr,
          primerLugar: rankingArr[0] || null,
          segundoLugar: rankingArr[1] || null,
          tercerLugar: rankingArr[2] || null
        });
      }

      if (profit && !profit.error) setProfitData(profit);
      if (Array.isArray(exp)) setExpenses(exp);
      if (Array.isArray(vtas)) setSales(vtas);
      if (Array.isArray(lapt)) setLaptops(lapt);
      if (vendMet && !vendMet.error) setVendorMetrics(vendMet);

    } catch (err) {
      console.error('Error sincronizando datos:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, [currentMonth, currentUser, inspectedVendorId]);

  // Configurar interceptor JWT y verificar sesión activa
  useEffect(() => {
    setupAuthInterceptor(() => {
      handleLogout();
    });

    const checkSession = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token || isTokenExpired(token)) {
        handleLogout();
        setLoadingInitial(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const freshUser = await res.json();
          setCurrentUser(freshUser);
          localStorage.setItem('auth_user', JSON.stringify(freshUser));
        } else if (res.status === 401) {
          handleLogout();
        }
      } catch (err) {
        console.warn('Sesión offline o error al conectar con /me:', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    checkSession();
  }, [handleLogout]);

  // Sincronizar datos cada vez que cambie usuario o periodo
  useEffect(() => {
    if (currentUser) {
      loadUsers();
      refreshAllData();
    }
  }, [currentUser, currentMonth, inspectedVendorId, refreshAllData]);

  // Inspeccionar portal de vendedor específico (Exclusivo Administrador)
  const handleInspectVendor = (vendorId) => {
    setInspectedVendorId(vendorId);
    setActiveTab('mi-portal');
  };

  // Registrar nueva venta
  const handleRegisterSale = async (saleData) => {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...saleData,
          usuario_solicitante_id: currentUser.id
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error registrando la venta');
      }
      await refreshAllData();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Actualizar estado de venta (Anular, devolver, etc.)
  const handleUpdateStatus = async (saleId, nuevoEstado, motivo) => {
    try {
      const res = await fetch(`/api/sales/${saleId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': currentUser.rol || 'admin',
          'x-user-id': String(currentUser.id || 1)
        },
        body: JSON.stringify({
          estado: nuevoEstado,
          newStatus: nuevoEstado,
          usuario_id: currentUser.id,
          motivo: motivo || `Cambio de estado a ${nuevoEstado}`,
          reason: motivo || `Cambio de estado a ${nuevoEstado}`
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error actualizando estado');
      }
      await refreshAllData();
      return { success: true };
    } catch (err) {
      alert(err.message);
      return { success: false };
    }
  };

  // Eliminar venta permanentemente
  const handleDeleteSale = async (saleId) => {
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': currentUser.rol || 'admin',
          'x-user-id': String(currentUser.id || 1)
        },
        body: JSON.stringify({
          usuario_id: currentUser.id
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar la venta');
      }
      await refreshAllData();
      return { success: true };
    } catch (err) {
      alert(err.message);
      return { success: false };
    }
  };

  // Guardar laptop en catálogo
  const handleSaveLaptop = async (laptopData, isEdit, id) => {
    try {
      const url = isEdit ? `/api/laptops/${id}` : '/api/laptops';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...laptopData,
          usuario_id: currentUser.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar equipo');
      await refreshAllData();
      return { success: true };
    } catch (err) {
      alert(err.message);
      return { success: false };
    }
  };

  // Eliminar / descontinuar laptop
  const handleDeleteLaptop = async (laptopId) => {
    if (!confirm('¿Estás seguro de dar de baja este equipo del catálogo?')) return;
    try {
      const res = await fetch(`/api/laptops/${laptopId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al dar de baja');
      await refreshAllData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Registrar gasto operativo del mes
  const handleAddExpense = async (expenseData) => {
    try {
      const res = await fetch('/api/reports/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseData,
          periodo: currentMonth,
          usuario_id: currentUser.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando gasto');
      await refreshAllData();
      return { success: true };
    } catch (err) {
      alert(err.message);
      return { success: false };
    }
  };

  // Control RBAC: Pestañas exclusivas para perfil Administrador
  const ADMIN_ONLY_TABS = ['dashboard', 'rentabilidad', 'comisiones', 'vendedores', 'reportes', 'auditoria'];
  const effectiveTab = (currentUser?.rol === 'vendedor' && ADMIN_ONLY_TABS.includes(activeTab))
    ? 'mi-portal'
    : activeTab;

  // 0. Si la ruta es el catálogo público (/catalogo o /catalog), servir de inmediato sin requerir login
  if (isPublicRoute) {
    return (
      <PublicCatalogView 
        onGoToLogin={() => {
          window.history.pushState({}, '', '/');
          setIsPublicRoute(false);
        }} 
      />
    );
  }

  // 1. Pantalla de carga inicial
  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold tracking-tight">LaptopPRO ERP — Gestión Comercial</h2>
        <p className="text-sm text-slate-400 mt-2">Verificando sesión y credenciales seguras...</p>
      </div>
    );
  }

  // 2. Si no hay sesión autenticada o token JWT válido, mostrar Pantalla de Login
  if (!currentUser || !authToken) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans antialiased">
      {/* Barra de navegación superior fija */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        currentMonth={currentMonth}
        onChangeMonth={setCurrentMonth}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        motivationAlert={vendorMetrics?.motivationAlert}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Barra lateral de navegación (Sidebar) */}
        <Sidebar
          activeTab={effectiveTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }}
          currentUser={currentUser}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          vendorMetrics={vendorMetrics}
          onLogout={handleLogout}
        />

        {/* Área de Contenido Principal */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary>
            {/* 1. Dashboard Principal (Admin) */}
            {effectiveTab === 'dashboard' && (
              currentUser.rol === 'admin' ? (
                <DashboardView
                  metrics={dashboardMetrics}
                  onGoToTab={(tab) => {
                    if (tab === 'ventas' || tab === 'ventas-nueva' || tab === 'sales') {
                      setActiveTab('ventas');
                      setOpenNewSaleModal(true);
                    } else {
                      setActiveTab(tab);
                    }
                  }}
                />
              ) : (
                <VendorPortalView
                  vendorMetrics={vendorMetrics}
                  currentUser={effectiveVendor}
                  laptops={laptops}
                  sales={sales}
                  vendors={usersList.filter(u => u.rol === 'vendedor')}
                  onNewSaleClick={() => {
                    setActiveTab('ventas');
                    setOpenNewSaleModal(true);
                  }}
                />
              )
            )}

            {/* 2. Portal Individual de Vendedor */}
            {(effectiveTab === 'mi-portal' || effectiveTab === 'vendor-portal') && (
              <VendorPortalView
                vendorMetrics={vendorMetrics}
                currentUser={effectiveVendor}
                laptops={laptops}
                sales={sales}
                vendors={usersList.filter(u => u.rol === 'vendedor')}
                onNewSaleClick={() => {
                  setActiveTab('ventas');
                  setOpenNewSaleModal(true);
                }}
              />
            )}

            {/* 3. Registro y Gestión de Ventas */}
            {(effectiveTab === 'ventas' || effectiveTab === 'sales') && (
              <SalesView
                sales={sales}
                laptops={laptops}
                vendors={usersList.filter(u => u.rol === 'vendedor')}
                currentUser={currentUser}
                onRegisterSale={handleRegisterSale}
                onUpdateStatus={handleUpdateStatus}
                onDeleteSale={handleDeleteSale}
                onRefresh={refreshAllData}
                initialOpenModal={openNewSaleModal}
                onResetOpenModal={() => setOpenNewSaleModal(false)}
              />
            )}

            {/* 4. Catálogo de Laptops & Precios Mínimos */}
            {(effectiveTab === 'catalogo' || effectiveTab === 'catalog') && (
              <CatalogView
                laptops={laptops}
                vendors={usersList.filter(u => u.rol === 'vendedor')}
                currentUser={currentUser}
                onSaveLaptop={handleSaveLaptop}
                onDeleteLaptop={handleDeleteLaptop}
                onRefresh={refreshAllData}
              />
            )}

            {/* 4.1. Catálogo Público Web (Gestión y Enlaces para Vendedores y Admin) */}
            {(effectiveTab === 'catalogo-publico' || effectiveTab === 'public-catalog') && (
              <PublicCatalogAdminView
                laptops={laptops}
                currentUser={currentUser}
                onRefresh={refreshAllData}
              />
            )}

            {/* 5. Ranking Mensual de Vendedores */}
            {effectiveTab === 'ranking' && (
              <RankingView
                rankingData={rankingData}
              />
            )}

            {/* 6. Control de Rentabilidad & Simulador */}
            {(effectiveTab === 'rentabilidad' || effectiveTab === 'profitability') && (
              <ProfitabilityView
                profitData={profitData}
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onRefresh={refreshAllData}
              />
            )}

            {/* 7. Escalas de Comisiones & Cierre */}
            {(effectiveTab === 'comisiones' || effectiveTab === 'rules') && (
              <CommissionRulesView
                currentMonth={currentMonth}
                currentUser={currentUser}
              />
            )}

            {/* 8. Administración de Vendedores */}
            {(effectiveTab === 'vendedores' || effectiveTab === 'vendors') && (
              <VendorsAdminView
                currentMonth={currentMonth}
                currentUser={currentUser}
                onSelectVendor={handleInspectVendor}
              />
            )}

            {/* 9. Reportes Mensuales (Excel / PDF) */}
            {(effectiveTab === 'reportes' || effectiveTab === 'monthly-report') && (
              <MonthlyReportView
                currentMonth={currentMonth}
                currentUser={currentUser}
              />
            )}

            {/* 10. Bitácora de Auditoría */}
            {(effectiveTab === 'auditoria' || effectiveTab === 'audit') && (
              <AuditView
                currentUser={currentUser}
              />
            )}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
