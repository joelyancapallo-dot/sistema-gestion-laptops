import React, { useState, useEffect } from 'react';
import { 
  Percent, Settings, CheckCircle2, AlertTriangle, Lock, History, 
  HelpCircle, DollarSign, Calculator, RefreshCw, Plus, Trash2, ArrowRight
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDateTime } from '../utils/formatters';

export function CommissionRulesView({ currentMonth, currentUser }) {
  const [rules, setRules] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Simulador de prueba interactivo
  const [testUnits, setTestUnits] = useState(21);
  const [testResult, setTestResult] = useState(null);

  // Formulario para cierre de periodo
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [closeSummary, setCloseSummary] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resRules, resPeriods] = await Promise.all([
        fetch('/api/commissions/rules'),
        fetch('/api/commissions/periods')
      ]);
      const dataRules = await resRules.json();
      const dataPeriods = await resPeriods.json();
      const normalizedRules = (Array.isArray(dataRules) ? dataRules : []).map(r => ({
        ...r,
        monto_comision: r.monto_comision || r.monto_por_unidad,
        rango_max: r.rango_max === 9999 ? null : r.rango_max
      }));
      setRules(normalizedRules);
      setPeriods(Array.isArray(dataPeriods) ? dataPeriods : []);
    } catch (err) {
      console.error('Error cargando reglas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calcular simulación local con las reglas actuales
  useEffect(() => {
    if (!rules || rules.length === 0) return;
    
    const count = parseInt(testUnits) || 0;
    if (count <= 0) {
      setTestResult({ commissionTotal: 0, rateApplied: 0, isRetroactive: false });
      return;
    }

    // Ordenar reglas por rango_min asc
    const sorted = [...rules].sort((a, b) => a.rango_min - b.rango_min);
    let matchedTier = sorted[0];
    for (const r of sorted) {
      if (count >= r.rango_min && (r.rango_max === null || count <= r.rango_max)) {
        matchedTier = r;
      }
    }

    if (matchedTier) {
      const isRetro = matchedTier.es_retroactivo;
      let total = 0;
      if (isRetro) {
        total = count * parseFloat(matchedTier.monto_comision);
      } else {
        // En caso de que no fuera retroactivo
        total = count * parseFloat(matchedTier.monto_comision);
      }
      setTestResult({
        commissionTotal: total,
        rateApplied: parseFloat(matchedTier.monto_comision),
        isRetroactive: isRetro,
        tierName: matchedTier.nombre_escala || `Rango ${matchedTier.rango_min} - ${matchedTier.rango_max || 'más'}`
      });
    }
  }, [testUnits, rules]);

  // Manejar edición de tramos en memoria
  const handleRuleChange = (index, field, value) => {
    const updated = [...rules];
    updated[index] = {
      ...updated[index],
      [field]: field === 'es_retroactivo' ? value : (field === 'rango_max' && value === '' ? null : value)
    };
    setRules(updated);
  };

  const handleAddRule = () => {
    const lastRule = rules[rules.length - 1];
    const newMin = lastRule ? (parseInt(lastRule.rango_max) || 21) + 1 : 1;
    setRules([
      ...rules,
      {
        id: `temp_${Date.now()}`,
        nombre_escala: `Escala Especial`,
        rango_min: newMin,
        rango_max: null,
        monto_comision: 60.00,
        es_retroactivo: true,
        descripcion: 'Nuevo tramo configurable'
      }
    ]);
  };

  const handleRemoveRule = (index) => {
    if (rules.length <= 1) {
      alert('Debe existir al menos un tramo de comisiones.');
      return;
    }
    const updated = rules.filter((_, i) => i !== index);
    setRules(updated);
  };

  const handleSaveRules = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = rules.map(r => ({
        ...r,
        rango_min: parseInt(r.rango_min),
        rango_max: r.rango_max ? parseInt(r.rango_max) : null,
        monto_comision: parseFloat(r.monto_comision),
        es_retroactivo: !!r.es_retroactivo
      }));

      const res = await fetch('/api/commissions/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: payload,
          usuario_id: currentUser?.id
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: '¡Escala de comisiones actualizada exitosamente!' });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Error al guardar reglas' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error de conexión con el servidor.' });
    } finally {
      setSaving(false);
    }
  };

  // Cargar resumen para cerrar periodo
  const handleOpenCloseModal = async () => {
    try {
      const res = await fetch(`/api/reports/profitability?periodo=${currentMonth}`);
      const data = await res.json();
      setCloseSummary(data);
      setShowCloseModal(true);
    } catch (err) {
      alert('Error obteniendo resumen del periodo');
    }
  };

  const handleConfirmClosePeriod = async () => {
    if (!confirm(`¿Estás 100% seguro de cerrar el periodo mensual ${currentMonth}? Una vez cerrado, las reglas y liquidaciones de este mes quedarán selladas históricamente.`)) {
      return;
    }

    setClosing(true);
    try {
      const res = await fetch('/api/commissions/close-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo: currentMonth,
          usuario_id: currentUser?.id,
          notas: closeNotes || `Cierre mensual ejecutado por ${currentUser?.nombre || 'Administrador'}`
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`¡Periodo ${currentMonth} cerrado exitosamente! Registro sellado en el historial.`);
        setShowCloseModal(false);
        fetchData();
      } else {
        alert(data.error || 'Error cerrando periodo');
      }
    } catch (err) {
      alert('Error de conexión al cerrar periodo');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <Percent className="w-3.5 h-3.5" />
            Control Comercial & Liquidaciones
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Escalas de Comisiones y Cierre Mensual</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configuración dinámica de comisiones retroactivas y resguardo histórico por periodos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCloseModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <Lock className="w-4 h-4" />
            Cerrar Periodo ({currentMonth})
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Grid: Editor de Reglas vs Simulador Interactivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor de Tramos (2 columnas) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Reglas y Tramos de Comisión Activos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Modifica los límites y montos sin alterar el código fuente. Aplica a ventas activas del mes.
              </p>
            </div>
            <button
              onClick={handleAddRule}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Tramo
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="p-3">Nombre Escala</th>
                  <th className="p-3">Rango Mín</th>
                  <th className="p-3">Rango Máx</th>
                  <th className="p-3">Comisión / Und</th>
                  <th className="p-3 text-center">¿Retroactivo?</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule, idx) => (
                  <tr key={rule.id || idx} className="hover:bg-slate-50/75 transition-colors">
                    <td className="p-3">
                      <input
                        type="text"
                        value={rule.nombre_escala || ''}
                        onChange={(e) => handleRuleChange(idx, 'nombre_escala', e.target.value)}
                        className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={rule.rango_min}
                          onChange={(e) => handleRuleChange(idx, 'rango_min', e.target.value)}
                          className="w-16 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-center"
                        />
                        <span className="text-xs text-slate-400">laptops</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          placeholder="Sin límite"
                          value={rule.rango_max === null ? '' : rule.rango_max}
                          onChange={(e) => handleRuleChange(idx, 'rango_max', e.target.value)}
                          className="w-16 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-center"
                        />
                        <span className="text-xs text-slate-400">laptops</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-medium">S/</span>
                        <input
                          type="number"
                          step="1"
                          value={rule.monto_comision}
                          onChange={(e) => handleRuleChange(idx, 'monto_comision', e.target.value)}
                          className="w-24 pl-7 pr-2 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!rule.es_retroactivo}
                          onChange={(e) => handleRuleChange(idx, 'es_retroactivo', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                      </label>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRemoveRule(idx)}
                        disabled={rules.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                        title="Eliminar tramo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>
                <strong>Importante:</strong> Al marcar <em>Retroactivo</em>, todas las unidades del mes se recalcularán a esa tarifa una vez alcanzado el rango.
              </span>
            </div>
            <button
              onClick={handleSaveRules}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar Cambios de Escala'}
            </button>
          </div>
        </div>

        {/* Simulador Interactivo de Comisiones (1 columna) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
              <Calculator className="w-3.5 h-3.5" />
              Simulador en Tiempo Real
            </div>
            <h2 className="text-lg font-bold">Comprobador de Reglas</h2>
            <p className="text-xs text-slate-400 mt-1">
              Prueba cómo responderá el sistema con cualquier volumen de ventas.
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-slate-300">Laptops Vendidas en el Mes:</label>
              <span className="text-xl font-extrabold text-amber-400">{testUnits} und.</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={testUnits}
              onChange={(e) => setTestUnits(e.target.value)}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>1 und</span>
              <span className="text-amber-300 font-bold">20 und</span>
              <span className="text-emerald-400 font-bold">21 und (Salto)</span>
              <span>50 und</span>
            </div>
          </div>

          {testResult && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
                <div className="text-xs text-slate-400">Escala Aplicada:</div>
                <div className="text-sm font-bold text-white">{testResult.tierName}</div>
                <div className="flex justify-between text-xs text-slate-300 pt-1 border-t border-slate-700">
                  <span>Tarifa por unidad:</span>
                  <span className="font-bold text-white">{formatCurrency(testResult.rateApplied)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Modo de cálculo:</span>
                  <span className={`font-semibold ${testResult.isRetroactive ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {testResult.isRetroactive ? 'Retroactivo a todas las und.' : 'Escalonado tradicional'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/40 text-center">
                <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  Comisión Total a Pagar
                </div>
                <div className="text-3xl font-extrabold text-emerald-300 mt-1">
                  {formatCurrency(testResult.commissionTotal)}
                </div>
                <div className="text-[11px] text-emerald-200/80 mt-1">
                  {testUnits} laptops × {formatCurrency(testResult.rateApplied)} / und
                </div>
              </div>

              {/* Casos emblemáticos del prompt */}
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 space-y-1">
                <div className="font-semibold text-slate-300">Hitos del Negocio:</div>
                <div className="flex justify-between text-[11px]">
                  <span>20 laptops (Base S/ 25):</span>
                  <span className="text-slate-200 font-mono">S/ 500</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-300 font-bold">
                  <span>21 laptops (Salto S/ 50 Retro):</span>
                  <span className="font-mono">S/ 1,050 (+S/ 550)</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>30 laptops:</span>
                  <span className="text-slate-200 font-mono">S/ 1,500</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historial de Periodos Cerrados */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Historial de Periodos Cerrados & Sellos de Liquidación
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Los meses cerrados quedan inmutables. Cambios en la configuración no alteran periodos pasados.
            </p>
          </div>
        </div>

        {periods.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Lock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">Aún no se han ejecutado cierres formales de periodos.</p>
            <p className="text-xs text-slate-400 mt-1">
              Al finalizar cada mes calendario, haz clic en "Cerrar Periodo" para sellar las liquidaciones.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="p-3">Periodo</th>
                  <th className="p-3">Fecha de Cierre</th>
                  <th className="p-3 text-right">Laptops Vendidas</th>
                  <th className="p-3 text-right">Venta Total</th>
                  <th className="p-3 text-right">Comisiones Pagadas</th>
                  <th className="p-3 text-right">Diferencias Negoc.</th>
                  <th className="p-3 text-right">Utilidad Neta</th>
                  <th className="p-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/75">
                    <td className="p-3 font-bold text-slate-800">{p.periodo}</td>
                    <td className="p-3 text-xs text-slate-500">{formatDateTime(p.fecha_cierre)}</td>
                    <td className="p-3 text-right font-medium text-slate-700">{formatNumber(p.total_laptops_vendidas)} und.</td>
                    <td className="p-3 text-right font-bold text-slate-800">{formatCurrency(p.total_ventas_monto)}</td>
                    <td className="p-3 text-right font-semibold text-rose-600">{formatCurrency(p.total_comisiones)}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600">{formatCurrency(p.total_diferencias)}</td>
                    <td className="p-3 text-right font-bold text-indigo-600">{formatCurrency(p.ganancia_neta_negocio)}</td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                        <Lock className="w-3 h-3 text-slate-500" />
                        Sellado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cierre de Periodo */}
      {showCloseModal && closeSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Cierre y Liquidación de Periodo</h3>
                  <p className="text-xs text-slate-400">Periodo a sellar: {currentMonth}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Resumen financiero del cierre */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Laptops Válidas Vendidas:</span>
                <span className="font-bold text-slate-800">{closeSummary.laptopsVendidas} unidades</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Ingreso Total Bruto:</span>
                <span className="font-bold text-slate-800">{formatCurrency(closeSummary.ingresosVentas)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-medium">
                <span>(-) Comisiones por Volumen a Liquidar:</span>
                <span className="font-bold">{formatCurrency(closeSummary.comisionesTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>(+) Diferencias Entregadas a Vendedores:</span>
                <span className="font-bold">{formatCurrency(closeSummary.diferenciasTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>(-) Gastos Operativos del Local:</span>
                <span className="font-bold text-slate-800">{formatCurrency(closeSummary.gastosOperativos)}</span>
              </div>
              <div className="flex justify-between text-indigo-700 font-bold pt-2 border-t border-slate-200 text-sm">
                <span>(=) Utilidad Neta del Negocio:</span>
                <span>{formatCurrency(closeSummary.gananciaNeta)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notas u Observaciones del Cierre (Opcional):
              </label>
              <textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Ejemplo: Comisiones aprobadas en reunión del 30 del mes. Pago efectuado por transferencia."
                rows="3"
                className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Esta acción es irreversible y almacena una copia exacta de las reglas vigentes en este momento.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClosePeriod}
                disabled={closing}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {closing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {closing ? 'Sellando periodo...' : 'Confirmar y Sellar Periodo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
