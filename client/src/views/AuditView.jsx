import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, Filter, AlertTriangle, FileText, CheckCircle, 
  Clock, User, RefreshCw, Lock, ArrowRight, Eye
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

export function AuditView({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/audit?limit=150');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando bitácora de auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (action) => {
    switch (action) {
      case 'AUTORIZACION_EXCEPCION_PRECIO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Excepción de Precio
          </span>
        );
      case 'VENTA_CREADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 text-blue-600" />
            Venta Registrada
          </span>
        );
      case 'ESTADO_CAMBIADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <RefreshCw className="w-3 h-3 text-purple-600" />
            Estado Actualizado
          </span>
        );
      case 'PERIODO_CERRADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <Lock className="w-3 h-3 text-rose-600" />
            Periodo Sellado
          </span>
        );
      case 'REGLAS_MODIFICADAS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Reglas Editadas
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.usuario_nombre && log.usuario_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.accion && log.accion.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.entidad && log.entidad.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.entidad_id && log.entidad_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesEntity = selectedEntity === 'all' || log.entidad === selectedEntity;

    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Seguridad & Cumplimiento
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Bitácora de Auditoría e Historial de Cambios</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro inmutable de excepciones de precios, anulaciones, modificaciones de catálogo y cierres de comisiones.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar Bitácora
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por usuario, código, acción o entidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Todas las Entidades</option>
            <option value="ventas">Ventas & Estados</option>
            <option value="reglas_comision">Reglas de Comisión</option>
            <option value="periodos_cierre">Cierres de Periodo</option>
            <option value="laptops">Catálogo de Laptops</option>
          </select>
        </div>
      </div>

      {/* Tabla de Auditoría */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No se encontraron eventos en la bitácora con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Fecha y Hora</th>
                  <th className="p-3.5">Usuario Responsable</th>
                  <th className="p-3.5">Acción Registrada</th>
                  <th className="p-3.5">Entidad Afectada</th>
                  <th className="p-3.5">Identificador</th>
                  <th className="p-3.5">Resumen de Cambios</th>
                  <th className="p-3.5 text-center">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="p-3.5 whitespace-nowrap text-slate-500 font-mono">
                      {formatDateTime(log.fecha)}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.usuario_nombre || 'Sistema Automatizado'}</span>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {getActionBadge(log.accion)}
                    </td>
                    <td className="p-3.5 capitalize font-medium text-slate-600">
                      {log.entidad}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {log.entidad_id || '-'}
                    </td>
                    <td className="p-3.5 max-w-xs truncate text-slate-600">
                      {log.detalles ? (
                        <span>
                          {log.detalles.motivo || log.detalles.estado_nuevo || log.detalles.precio_final || JSON.stringify(log.detalles).slice(0, 50)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver carga JSON de auditoría"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detalle JSON de Auditoría */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Registro de Seguridad #{selectedLog.id}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Acción:</span>
                <span className="font-bold text-slate-800">{selectedLog.accion}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Usuario:</span>
                <span className="font-bold text-slate-800">{selectedLog.usuario_nombre}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Fecha y Hora:</span>
                <span className="font-mono text-slate-700">{formatDateTime(selectedLog.fecha)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Entidad / ID:</span>
                <span className="font-mono text-slate-700">{selectedLog.entidad} • {selectedLog.entidad_id}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1.5">Datos del Evento (Payload):</div>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.detalles, null, 2)}
              </pre>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
