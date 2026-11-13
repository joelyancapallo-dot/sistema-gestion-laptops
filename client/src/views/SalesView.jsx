import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trash2,
  Laptop, 
  ShieldAlert,
  ArrowRight,
  Info,
  UserCheck
} from 'lucide-react';
import { formatCurrency, formatDate, getLocalDateString } from '../utils/formatters';
import { exportToExcel } from '../utils/exportExcel';

export default function SalesView({ 
  sales = [], 
  laptops = [], 
  vendors = [], 
  currentUser, 
  onRegisterSale, 
  onUpdateStatus, 
  onDeleteSale,
  onRefresh,
  initialOpenModal = false,
  onResetOpenModal
}) {
  const isAdmin = currentUser?.rol === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedCondicion, setSelectedCondicion] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(initialOpenModal);

  // Sincronizar apertura del modal cuando se invoca desde el dashboard (solo para administradores)
  useEffect(() => {
    if (initialOpenModal && isAdmin) {
      setFormData({
        laptop_id: '',
        vendedor_id: currentUser?.rol === 'vendedor' ? currentUser.id : (vendors[0]?.id || ''),
        precio_venta_final: '',
        metodo_pago: 'efectivo',
        fecha_venta: getLocalDateString(),
        estado: 'pagada',
        es_excepcion_precio: false,
        motivo_excepcion: '',
        notas: ''
      });
      setIsModalOpen(true);
      if (onResetOpenModal) onResetOpenModal();
    } else if (initialOpenModal && !isAdmin && onResetOpenModal) {
      onResetOpenModal();
    }
  }, [initialOpenModal, onResetOpenModal, isAdmin, currentUser, vendors]);

  // Estado del formulario de nueva venta
  const [formData, setFormData] = useState({
    laptop_id: '',
    vendedor_id: currentUser?.rol === 'vendedor' ? currentUser.id : (vendors[0]?.id || ''),
    precio_venta_final: '',
    metodo_pago: 'efectivo',
    fecha_venta: getLocalDateString(),
    estado: 'pagada',
    es_excepcion_precio: false,
    motivo_excepcion: '',
    notas: ''
  });

  // Laptop seleccionada en el formulario
  const selectedLaptop = laptops.find(l => l.id === parseInt(formData.laptop_id, 10)) || null;
  const precioMin = selectedLaptop ? parseFloat(selectedLaptop.precio_minimo) : 0;
  const precioFinalNum = parseFloat(formData.precio_venta_final || 0);

  // Cálculos en vivo en el modal
  const esMenorAlMinimo = selectedLaptop && precioFinalNum > 0 && precioFinalNum < precioMin;
  const diferenciaVendedorCalculada = selectedLaptop && precioFinalNum > precioMin 
    ? Math.round((precioFinalNum - precioMin) * 100) / 100 
    : 0;

  // Filtrado de la tabla de ventas
  const filteredSales = sales.filter(s => {
    // Si el usuario tiene rol de vendedor, mostrar estrictamente SOLO las ventas que él mismo concretó
    if (!isAdmin && String(s.vendedor_id) !== String(currentUser?.id)) {
      return false;
    }

    const matchesSearch = 
      (s.codigo_venta?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.numero_serie?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.marca?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.modelo?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.vendedor_nombre?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.responsable_nombre?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesEstado = !selectedEstado || s.estado === selectedEstado;
    const matchesCondicion = !selectedCondicion || s.condicion === selectedCondicion;

    let matchesVendor = true;
    if (isAdmin && selectedVendedor) {
      matchesVendor = String(s.vendedor_id) === String(selectedVendedor);
    }

    return matchesSearch && matchesEstado && matchesCondicion && matchesVendor;
  });

  // Manejador de registro
  const handleSubmitSale = async (e) => {
    e.preventDefault();
    if (!formData.laptop_id) {
      alert('Por favor selecciona una laptop del catálogo disponible.');
      return;
    }
    if (!formData.precio_venta_final || precioFinalNum <= 0) {
      alert('Por favor ingresa un precio final de venta válido.');
      return;
    }

    if (esMenorAlMinimo && !isAdmin && !formData.es_excepcion_precio) {
      alert(`El precio final ingresado (S/ ${precioFinalNum.toFixed(2)}) es menor al precio mínimo autorizado (S/ ${precioMin.toFixed(2)}). Requiere autorización de excepción del administrador.`);
      return;
    }

    if (esMenorAlMinimo && (!formData.motivo_excepcion || formData.motivo_excepcion.trim().length === 0)) {
      alert('Para registrar una venta por debajo del precio mínimo es obligatorio indicar el motivo de la excepción.');
      return;
    }

    try {
      await onRegisterSale({
        ...formData,
        laptop_id: parseInt(formData.laptop_id, 10),
        vendedor_id: parseInt(formData.vendedor_id, 10),
        responsable_laptop_id: selectedLaptop ? selectedLaptop.responsable_id : null,
        precio_venta_final: precioFinalNum,
        es_excepcion_precio: esMenorAlMinimo
      });
      setIsModalOpen(false);
      // Reset form
      setFormData({
        laptop_id: '',
        vendedor_id: currentUser.rol === 'vendedor' ? currentUser.id : (vendors[0]?.id || ''),
        precio_venta_final: '',
        metodo_pago: 'efectivo',
        fecha_venta: getLocalDateString(),
        estado: 'pagada',
        es_excepcion_precio: false,
        motivo_excepcion: '',
        notas: ''
      });
    } catch (err) {
      alert('Error al registrar venta: ' + err.message);
    }
  };

  // Exportar a Excel
  const handleExportExcel = () => {
    const exportData = filteredSales.map(s => {
      const isCrossSale = s.responsable_laptop_id && String(s.responsable_laptop_id) !== String(s.vendedor_id);
      return {
        'Código': s.codigo_venta,
        'Fecha': s.fecha_venta?.slice(0, 10),
        'Vendedor (Cierre Venta)': s.vendedor_nombre,
        'Responsable Físico (Custodia)': s.responsable_nombre || s.vendedor_nombre,
        'Tipo Operación': isCrossSale ? 'Venta Cruzada (Custodia de otro vendedor)' : 'Venta Regular',
        'Marca': s.marca,
        'Modelo': s.modelo,
        'N° Serie': s.numero_serie,
        'Condición': s.condicion,
        ...(isAdmin ? {
          'Costo Adquisición': parseFloat(s.costo_adquisicion_hist || 0),
          'Gastos Adquisición': parseFloat(s.gastos_adquisicion_hist || 0),
        } : {}),
        'Precio Mínimo Catálogo': parseFloat(s.precio_minimo_hist || 0),
        'Precio Final Venta': parseFloat(s.precio_venta_final || 0),
        'Diferencia Vendedor (100%)': parseFloat(s.diferencia_vendedor || 0),
        'Comisión Volumen': parseFloat(s.comision_volumen || 0),
        ...(isAdmin ? {
          'Ganancia Base Negocio': parseFloat(s.ganancia_base_negocio || 0),
          'Ganancia Neta Negocio': parseFloat(s.ganancia_neta_negocio || 0),
        } : {}),
        'Método de Pago': s.metodo_pago,
        'Estado': s.estado,
        'Excepción Precio': s.es_excepcion_precio ? 'SÍ' : 'NO'
      };
    });

    exportToExcel(exportData, `Ventas_Laptops_${getLocalDateString()}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Barra Superior con Acciones y Filtros */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Registro de Operaciones y Ventas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Control detallado de cada laptop vendida, diferencias de negociación y estado
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
            title="Exportar a Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setFormData({
                  laptop_id: '',
                  vendedor_id: currentUser.rol === 'vendedor' ? currentUser.id : (vendors[0]?.id || ''),
                  precio_venta_final: '',
                  metodo_pago: 'efectivo',
                  fecha_venta: getLocalDateString(),
                  estado: 'pagada',
                  es_excepcion_precio: false,
                  motivo_excepcion: '',
                  notas: ''
                });
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Venta</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros de Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        {/* Buscador */}
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text"
            placeholder="Buscar por código de venta, serie, marca, modelo o vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtro Vendedor / Alcance */}
        {isAdmin ? (
          <div>
            <select 
              value={selectedVendedor} 
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">Todos los Vendedores</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>Ventas de: {v.nombre}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 font-bold truncate">
            <UserCheck className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
            <span className="truncate">Vendedor: {currentUser?.nombre}</span>
          </div>
        )}

        {/* Filtro Estado */}
        <div>
          <select 
            value={selectedEstado} 
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="">Todos los Estados</option>
            <option value="pagada">Pagada (Válida)</option>
            <option value="entregada">Entregada (Válida)</option>
            <option value="pendiente">Pendiente</option>
            <option value="anulada">Anulada (Excluida)</option>
            <option value="devuelta">Devuelta (Excluida)</option>
          </select>
        </div>

        {/* Filtro Condición */}
        <div>
          <select 
            value={selectedCondicion} 
            onChange={(e) => setSelectedCondicion(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="">Todas las Condiciones</option>
            <option value="nueva">Nueva</option>
            <option value="seminueva">Seminueva</option>
          </select>
        </div>
      </div>

      {/* Tabla Interactiva de Ventas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Vendedor & Custodia</th>
                <th className="py-3 px-3">Laptop & Serie</th>
                <th className="py-3 px-3 text-center">Condición</th>
                {isAdmin && <th className="py-3 px-3 text-right">Costo Total</th>}
                <th className="py-3 px-3 text-right">Precio Mínimo</th>
                <th className="py-3 px-3 text-right">Precio Final</th>
                <th className="py-3 px-3 text-right text-amber-700 bg-amber-50/50">Diferencia Vendedor</th>
                <th className="py-3 px-3 text-right text-purple-700">Comisión Vol.</th>
                {isAdmin && <th className="py-3 px-3 text-right text-emerald-700">Ganancia Neta</th>}
                <th className="py-3 px-3 text-center">Método</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => {
                  const isAnuladaOrDevuelta = ['anulada', 'devuelta'].includes(sale.estado);
                  const costoTotal = parseFloat(sale.costo_adquisicion_hist || 0) + parseFloat(sale.gastos_adquisicion_hist || 0);
                  const isCrossSale = sale.responsable_laptop_id && String(sale.responsable_laptop_id) !== String(sale.vendedor_id);
                  return (
                    <tr 
                      key={sale.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isAnuladaOrDevuelta ? 'opacity-50 bg-slate-50/50 line-through-items' : ''}`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {sale.codigo_venta}
                        {sale.es_excepcion_precio && (
                          <span className="block text-[9px] font-bold text-red-600 uppercase" title={sale.motivo_excepcion}>
                            ⚠️ Excepción
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(sale.fecha_venta)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center space-x-1">
                          <span>{sale.vendedor_nombre}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-1">
                          <span className="text-slate-400">Custodia:</span>
                          <span className={`font-semibold ${isCrossSale ? 'text-indigo-700 bg-indigo-50 px-1 rounded' : 'text-slate-600'}`}>
                            {sale.responsable_nombre || 'No asignado'}
                          </span>
                        </div>
                        {isCrossSale && (
                          <span className="inline-block text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded mt-0.5 shadow-xs" title={`Venta cerrada por ${sale.vendedor_nombre}, laptop bajo custodia de ${sale.responsable_nombre}`}>
                            ⚡ Venta Cruzada
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{sale.marca} {sale.modelo}</div>
                        <div className="text-[10px] font-mono text-slate-400">{sale.numero_serie}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          sale.condicion === 'nueva' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {sale.condicion}
                        </span>
                      </td>

                      {/* Costo solo para Admin */}
                      {isAdmin && (
                        <td className="py-3 px-3 text-right text-slate-500">
                          {formatCurrency(costoTotal)}
                        </td>
                      )}

                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {formatCurrency(sale.precio_minimo_hist)}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                        {formatCurrency(sale.precio_venta_final)}
                      </td>

                      {/* Diferencia Vendedor (100% sobreprecio) */}
                      <td className="py-3 px-3 text-right font-bold text-amber-700 bg-amber-50/30">
                        {formatCurrency(sale.diferencia_vendedor)}
                      </td>

                      {/* Comisión por volumen */}
                      <td className="py-3 px-3 text-right font-semibold text-purple-700">
                        {formatCurrency(sale.comision_volumen)}
                      </td>

                      {/* Ganancia Neta Negocio solo para Admin */}
                      {isAdmin && (
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          {formatCurrency(sale.ganancia_neta_negocio)}
                        </td>
                      )}

                      <td className="py-3 px-3 text-center uppercase text-[10px] font-semibold text-slate-500">
                        {sale.metodo_pago?.replace('_', ' ')}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.estado === 'pagada' ? 'bg-emerald-100 text-emerald-700' :
                          sale.estado === 'entregada' ? 'bg-teal-100 text-teal-700' :
                          sale.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                          sale.estado === 'anulada' ? 'bg-red-100 text-red-700' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {sale.estado.toUpperCase()}
                        </span>
                      </td>

                      {/* Acciones de cambio de estado y eliminación */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isAdmin && (
                          <div className="flex items-center justify-center space-x-1">
                            {!isAnuladaOrDevuelta && (
                              <>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Motivo de anulación (la laptop volverá a estar disponible):');
                                    if (reason && reason.trim()) onUpdateStatus(sale.id, 'anulada', reason.trim());
                                  }}
                                  className="p-1 rounded text-red-500 hover:bg-red-50"
                                  title="Anular Venta (Libera Laptop al inventario)"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Motivo de devolución (la laptop volverá a estar disponible):');
                                    if (reason && reason.trim()) onUpdateStatus(sale.id, 'devuelta', reason.trim());
                                  }}
                                  className="p-1 rounded text-amber-600 hover:bg-amber-50"
                                  title="Registrar Devolución (Libera Laptop al inventario)"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`¿Estás seguro de ELIMINAR permanentemente la venta ${sale.codigo_venta}?\n\n• La laptop (${sale.marca} ${sale.modelo}) volverá al inventario 'disponible'.\n• Las comisiones del vendedor se recalcularán automáticamente.`)) {
                                  if (onDeleteSale) onDeleteSale(sale.id);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Eliminar venta permanentemente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {!isAdmin && (
                          <span className="text-[10px] text-slate-400 italic">Solo lectura</span>
                        )}
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 14 : 12} className="py-12 text-center text-slate-400">
                    {!isAdmin ? (
                      <div className="space-y-1">
                        <p className="font-bold text-slate-600 text-sm">
                          No tienes ventas registradas a tu nombre en este periodo.
                        </p>
                        <p className="text-xs text-slate-400">
                          Aquí se mostrarán únicamente las operaciones que hayas concretado como vendedor.
                        </p>
                      </div>
                    ) : (
                      'No se encontraron ventas que coincidan con los filtros.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE NUEVA VENTA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-slate-900">Registrar Nueva Venta</h2>
                  <p className="text-xs text-slate-500">Cálculo en vivo de diferencia e impacto comercial</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSale} className="mt-4 space-y-4 text-xs">
              
              {/* Selección de Laptop Disponible */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  1. Seleccionar Laptop Disponible del Catálogo *
                </label>
                <select
                  required
                  value={formData.laptop_id}
                  onChange={(e) => {
                    const lId = e.target.value;
                    const found = laptops.find(l => l.id === parseInt(lId, 10));
                    setFormData({
                      ...formData,
                      laptop_id: lId,
                      precio_venta_final: found && found.precio_minimo != null ? parseFloat(found.precio_minimo).toFixed(2) : '',
                      es_excepcion_precio: false,
                      motivo_excepcion: ''
                    });
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Elige una laptop en stock --</option>
                  {laptops.filter(l => l.estado === 'disponible' || l.estado === 'reservada').map(l => (
                    <option key={l.id} value={l.id}>
                      {l.marca} {l.modelo} ({l.condicion}) - Serie: {l.numero_serie} | Mínimo: S/ {parseFloat(l.precio_minimo).toFixed(2)}{l.estado === 'reservada' ? ` [RESERVADA por ${l.reservado_por_nombre || 'Vendedor'}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ficha rápida de la laptop seleccionada */}
              {selectedLaptop && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Equipo:</span>
                    <span className="font-bold text-slate-900">{selectedLaptop.marca} {selectedLaptop.modelo} ({selectedLaptop.condicion})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Número de Serie:</span>
                    <span className="font-mono text-slate-800">{selectedLaptop.numero_serie}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Especificaciones:</span>
                    <span className="text-slate-700">{selectedLaptop.procesador} / {selectedLaptop.ram} / {selectedLaptop.almacenamiento}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200">
                    <span className="text-indigo-900 font-bold text-[11px] flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Custodia Física (Stand / Responsable):</span>
                    </span>
                    <span className="font-extrabold text-indigo-950 text-xs">
                      {selectedLaptop.responsable_nombre || 'No asignado'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-semibold">
                    <span className="text-blue-700">Precio Mínimo Autorizado:</span>
                    <span className="text-blue-800 font-extrabold">{formatCurrency(selectedLaptop.precio_minimo)}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Costo Total Negocio (Adq. + Gastos):</span>
                      <span>{formatCurrency(parseFloat(selectedLaptop.costo_adquisicion) + parseFloat(selectedLaptop.gastos_adquisicion || 0))}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Vendedor que Concreta la Venta */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 block">
                    2. Vendedor que Concreta la Venta * (Gana la comisión y sobreprecio)
                  </label>
                  {currentUser?.rol === 'vendedor' && !isAdmin && (
                    <span className="text-[10px] text-slate-400">Tu usuario activo</span>
                  )}
                </div>

                <select
                  disabled={!isAdmin}
                  value={formData.vendedor_id}
                  onChange={(e) => setFormData({ ...formData, vendedor_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:opacity-85"
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} ({v.email})
                    </option>
                  ))}
                </select>

                {/* Banner explicativo de la regla de custodia física */}
                {selectedLaptop && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                      <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Regla de Custodia Física Confirmada:</span>
                    </div>
                    <p className="leading-tight text-slate-600">
                      La responsabilidad física de este equipo pertenece a <strong>{selectedLaptop.responsable_nombre || 'quien la recibió en su stand'}</strong>.
                      {selectedLaptop.responsable_id && String(selectedLaptop.responsable_id) !== String(formData.vendedor_id) ? (
                        <span className="block mt-1 font-semibold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          ⚡ <strong>Venta Cruzada:</strong> La venta y comisiones se computarán a favor de <strong>{vendors.find(v => String(v.id) === String(formData.vendedor_id))?.nombre || 'el vendedor que cerró la venta'}</strong>, manteniendo a {selectedLaptop.responsable_nombre} como responsable histórico de la custodia hasta el momento de la venta.
                        </span>
                      ) : (
                        <span className="block mt-1 text-slate-500">
                          El vendedor que concreta la venta coincide con el custodio del equipo.
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Precio Final de Venta */}
              <div>
                <label className="font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>3. Precio Final Negociado con el Cliente (S/) *</span>
                  {selectedLaptop && (
                    <span className="text-[11px] font-semibold text-blue-600">
                      Sugerido (Mínimo): S/ {parseFloat(selectedLaptop.precio_minimo).toFixed(2)}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={selectedLaptop ? parseFloat(selectedLaptop.precio_minimo).toFixed(2) : "Ej: 950.00"}
                    value={formData.precio_venta_final}
                    onChange={(e) => setFormData({ ...formData, precio_venta_final: e.target.value })}
                    onBlur={() => {
                      const num = parseFloat(formData.precio_venta_final);
                      if (!isNaN(num) && num > 0) {
                        setFormData(prev => ({
                          ...prev,
                          precio_venta_final: num.toFixed(2)
                        }));
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Panel de Cálculo en Vivo de Diferencia de Negociación */}
              {selectedLaptop && precioFinalNum > 0 && (
                <div>
                  {precioFinalNum > precioMin && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-amber-600" />
                          <span>¡Diferencia para el Vendedor (100%)!</span>
                        </span>
                        <span className="text-sm font-black text-amber-800">
                          +{formatCurrency(diferenciaVendedorCalculada)}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/80 mt-1">
                        Vendiste por encima del mínimo (S/ {precioMin.toFixed(2)}). Este excedente ingresará directamente a tus incentivos adicionales.
                      </p>
                    </div>
                  )}

                  {esMenorAlMinimo && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-950 space-y-2">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-red-700">Precio por debajo del mínimo autorizado</p>
                          <p className="text-[11px] text-red-800/90">
                            El precio mínimo es S/ {precioMin.toFixed(2)}. No se permite registrar ventas inferiores sin autorización del administrador.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-red-900 block mb-1">
                          Motivo obligatorio de la excepción de precio:
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Cliente compra en efectivo al por mayor / Autorizado por el dueño"
                          value={formData.motivo_excepcion}
                          onChange={(e) => setFormData({ ...formData, motivo_excepcion: e.target.value, es_excepcion_precio: true })}
                          className="w-full p-2 bg-white border border-red-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Método de Pago y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Método de Pago</label>
                  <select
                    value={formData.metodo_pago}
                    onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="yape_plin">Yape / Plin</option>
                    <option value="transferencia">Transferencia BCP/BBVA</option>
                    <option value="tarjeta_credito">Tarjeta de Crédito</option>
                    <option value="tarjeta_debito">Tarjeta de Débito</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de Operación</label>
                  <input
                    type="date"
                    value={formData.fecha_venta}
                    onChange={(e) => setFormData({ ...formData, fecha_venta: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Estado de la Venta */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Estado de la Operación</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="pagada">Pagada (Computable para Comisión)</option>
                  <option value="entregada">Entregada (Computable para Comisión)</option>
                  <option value="pendiente">Pendiente (Reserva Equipo)</option>
                </select>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Notas u Observaciones (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Incluye funda y mouse de regalo"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20"
                >
                  Confirmar y Registrar Venta
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
