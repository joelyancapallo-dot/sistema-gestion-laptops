import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Edit3, UserCheck, UserX, Mail, Phone, Calendar, 
  Award, TrendingUp, DollarSign, CheckCircle2, AlertTriangle, Shield, RefreshCw
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';

export function VendorsAdminView({ currentMonth, currentUser, onSelectVendor }) {
  const [vendors, setVendors] = useState([]);
  const [vendorMetrics, setVendorMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    rol: 'vendedor'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resUsers, resRanking] = await Promise.all([
        fetch('/api/auth/users').then(r => r.ok ? r.json() : fetch('/api/auth/vendors').then(v => v.json()).catch(() => [])).catch(() => []),
        fetch(`/api/reports/ranking?periodo=${currentMonth}`).then(r => r.json()).catch(() => [])
      ]);
      const dataUsers = resUsers;
      const dataRanking = resRanking;

      setVendors(Array.isArray(dataUsers) ? dataUsers : []);

      // Mapear métricas por ID de vendedor (soporta tanto formato directo como anidado)
      const metricsMap = {};
      const rankingList = Array.isArray(dataRanking) 
        ? dataRanking 
        : (dataRanking && Array.isArray(dataRanking.ranking) ? dataRanking.ranking : []);

      rankingList.forEach(v => {
        const vId = v.vendedor_id || v.vendedorId || v.id;
        metricsMap[vId] = {
          laptops_vendidas: v.laptops_vendidas ?? v.laptopsVendidas ?? 0,
          total_ventas: v.total_ventas ?? v.totalVendidoSoles ?? 0,
          comisiones_acumuladas: v.comisiones_acumuladas ?? v.comisionesAcumuladas ?? 0,
          diferencias_negociacion: v.diferencias_negociacion ?? v.diferenciasNegociacion ?? 0,
          ingreso_total_vendedor: v.ingreso_total_vendedor ?? v.totalIngresosAdicionales ?? 0
        };
      });
      setVendorMetrics(metricsMap);
    } catch (err) {
      console.error('Error cargando vendedores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      password: '',
      rol: 'vendedor'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      nombre: vendor.nombre,
      email: vendor.email,
      telefono: vendor.telefono || '',
      password: '',
      rol: vendor.rol
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (vendor) => {
    const action = vendor.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de ${action} a ${vendor.nombre}?`)) return;

    try {
      const res = await fetch(`/api/auth/users/${vendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: !vendor.activo
        })
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Error al actualizar estado del vendedor');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingVendor) {
        // Actualizar
        const payload = {
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
          rol: formData.rol
        };
        if (formData.password.trim()) {
          payload.password = formData.password;
        }

        const res = await fetch(`/api/auth/users/${editingVendor.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setShowModal(false);
          fetchData();
        } else {
          const err = await res.json();
          alert(err.error || 'Error al actualizar');
        }
      } else {
        // Crear nuevo
        if (!formData.password.trim()) {
          alert('Por favor asigna una contraseña temporal para el nuevo vendedor.');
          setSaving(false);
          return;
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          setShowModal(false);
          fetchData();
        } else {
          const err = await res.json();
          alert(err.error || 'Error al registrar vendedor');
        }
      }
    } catch (err) {
      alert('Error de comunicación con el servidor');
    } finally {
      setSaving(false);
    }
  };

  const safeVendors = Array.isArray(vendors) ? vendors : [];
  const vendedoresOnly = safeVendors.filter(u => u.rol === 'vendedor');

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            Equipo Comercial Ilimitado
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Administración de Vendedores</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona tu fuerza de ventas, da de alta nuevos colaboradores y monitorea sus incentivos.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Vendedor
        </button>
      </div>

      {/* Grid de Vendedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {vendedoresOnly.map((vendor) => {
          const metrics = vendorMetrics[vendor.id] || {
            laptops_vendidas: 0,
            total_ventas: 0,
            comisiones_acumuladas: 0,
            diferencias_negociacion: 0,
            ingreso_total_vendedor: 0
          };

          return (
            <div 
              key={vendor.id}
              className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${
                vendor.activo ? 'border-slate-200 hover:shadow-md' : 'border-slate-200/60 opacity-60 bg-slate-50/50'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm ${
                    vendor.activo ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {vendor.nombre.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      {vendor.nombre}
                      {!vendor.activo && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          Inactivo
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span>{vendor.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(vendor)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar datos"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(vendor)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      vendor.activo 
                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' 
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={vendor.activo ? 'Desactivar vendedor' : 'Activar vendedor'}
                  >
                    {vendor.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Teléfono y Fecha */}
              <div className="py-3 text-xs text-slate-500 flex items-center justify-between border-b border-slate-100">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {vendor.telefono || 'Sin teléfono'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Desde: {formatDate(vendor.fecha_ingreso)}
                </span>
              </div>

              {/* Métricas del Mes Actual */}
              <div className="pt-4 space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Rendimiento en {currentMonth}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <div className="text-[11px] text-slate-500">Laptops Vendidas</div>
                    <div className="text-lg font-extrabold text-slate-800">
                      {formatNumber(metrics.laptops_vendidas)} <span className="text-xs font-normal text-slate-400">und.</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <div className="text-[11px] text-slate-500">Total Facturado</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {formatCurrency(metrics.total_ventas)}
                    </div>
                  </div>
                </div>

                {/* Ingresos del Vendedor */}
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-700 font-medium">Comisión por Volumen:</span>
                    <span className="font-bold text-emerald-800">{formatCurrency(metrics.comisiones_acumuladas)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-700 font-medium">Diferencias Negociación:</span>
                    <span className="font-bold text-emerald-800">{formatCurrency(metrics.diferencias_negociacion)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-emerald-200/60 flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-900">Total Ingresos Vendedor:</span>
                    <span className="font-extrabold text-sm text-emerald-900">{formatCurrency(metrics.ingreso_total_vendedor)}</span>
                  </div>
                </div>
              </div>

              {/* Botón ver detalle del vendedor */}
              {onSelectVendor && (
                <button
                  onClick={() => onSelectVendor(vendor.id)}
                  className="w-full mt-4 py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
                >
                  Ver Perfil Individual & Metas &rarr;
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Administradores del Sistema */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-600" />
          Cuentas Administradoras (Acceso Total y Autorizaciones)
        </h2>
        <div className="divide-y divide-slate-100">
          {safeVendors.filter(u => u.rol === 'admin').map(admin => (
            <div key={admin.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  {admin.nombre.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{admin.nombre}</div>
                  <div className="text-xs text-slate-400">{admin.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  Propietario / Admin
                </span>
                <button
                  onClick={() => handleOpenEdit(admin)}
                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Agregar / Editar Vendedor */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {editingVendor ? 'Editar Vendedor' : 'Dar de Alta Nuevo Vendedor'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingVendor ? 'Actualiza los datos del usuario' : 'Sin límite de vendedores'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sofía Mendoza"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico (Login) *</label>
                <input
                  type="email"
                  required
                  placeholder="sofia@tiendalaptops.pe"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teléfono Móvil</label>
                <input
                  type="tel"
                  placeholder="+51 987 654 321"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingVendor ? 'Cambiar Contraseña (dejar vacío para no modificar)' : 'Contraseña de Acceso *'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rol en el Sistema</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="vendedor">Vendedor (Acceso restringido a sus ventas e incentivos)</option>
                  <option value="admin">Administrador (Control total, costos y rentabilidad)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm inline-flex items-center gap-2"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saving ? 'Guardando...' : editingVendor ? 'Actualizar Datos' : 'Registrar Vendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
