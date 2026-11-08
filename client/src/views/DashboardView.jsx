import React from 'react';
import { 
  Laptop, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Gift, 
  PiggyBank, 
  ArrowUpRight, 
  Users, 
  Calendar,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { formatCurrency, formatPercent, getMonthName } from '../utils/formatters';

export default function DashboardView({ metrics, onGoToTab }) {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        Cargando indicadores comerciales en tiempo real...
      </div>
    );
  }

  const {
    monthYear,
    totalLaptops,
    totalVentasSoles,
    gananciaBrutaBaseNegocio,
    totalComisionesAcumuladas,
    totalDiferenciasVendedores,
    totalEntregadoVendedores,
    otrosGastosOperativos,
    gananciaRestanteNegocio,
    topVendedor,
    promedioDiarioVentas,
    metaGlobalLaptops,
    porcentajeCumplimientoMeta,
    evolucionDiaria = [],
    vendorPerformances = []
  } = metrics;

  return (
    <div className="space-y-6">
      
      {/* Encabezado del Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Panel de Control Comercial
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Métricas de ventas, comisiones retroactivas y rentabilidad real de <span className="font-semibold text-blue-600">{getMonthName(monthYear)}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onGoToTab('ventas')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Laptop className="w-4 h-4" />
            <span>Nueva Venta</span>
          </button>
          <button
            onClick={() => onGoToTab('rentabilidad')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Ver Rentabilidad</span>
          </button>
        </div>
      </div>

      {/* Grid Principal de Tarjetas de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Laptops Vendidas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Laptops Vendidas</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalLaptops} <span className="text-sm font-semibold text-slate-400">unidades</span></div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Meta: {metaGlobalLaptops} uds.</span>
              <span className="font-semibold text-blue-600">{porcentajeCumplimientoMeta}% cumplido</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full" 
                style={{ width: `${Math.min(100, porcentajeCumplimientoMeta)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Total Ventas en Soles */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Facturado</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{formatCurrency(totalVentasSoles)}</div>
            <div className="mt-1 text-xs text-slate-500">
              Promedio diario: <span className="font-semibold text-slate-700">{promedioDiarioVentas} laptops/día</span>
            </div>
          </div>
        </div>

        {/* Ganancia Base del Negocio */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ganancia Base</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-950">{formatCurrency(gananciaBrutaBaseNegocio)}</div>
            <div className="mt-1 text-xs text-slate-500">
              Margen base del catálogo antes de incentivos
            </div>
          </div>
        </div>

        {/* Utilidad Neta Restante del Negocio (Real) */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-md shadow-emerald-600/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Ganancia Neta Restante</span>
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold">{formatCurrency(gananciaRestanteNegocio)}</div>
            <div className="mt-1 text-xs text-emerald-100">
              Utilidad libre para ti tras pagar comisiones y gastos
            </div>
          </div>
        </div>

      </div>

      {/* Fila Secundaria: Desglose de Pagos a Vendedores & Top Vendedor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Comisiones Retroactivas Pagadas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-bold uppercase">
            <Gift className="w-4 h-4 text-purple-600" />
            <span>Comisiones Retroactivas</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatCurrency(totalComisionesAcumuladas)}</div>
          <p className="text-xs text-slate-500 mt-1">
            Por escala mensual acumulada (S/ 25 o S/ 50 por unidad).
          </p>
        </div>

        {/* Diferencias por Negociación (100% Vendedor) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-bold uppercase">
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
            <span>Diferencias de Negociación</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">{formatCurrency(totalDiferenciasVendedores)}</div>
          <p className="text-xs text-slate-500 mt-1">
            100% entregado a vendedores por vender por encima del mínimo.
          </p>
        </div>

        {/* Top Vendedor Destacado */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Líder de Ventas (1° Lugar)</span>
            </div>
            {topVendedor ? (
              <div className="mt-2">
                <p className="font-extrabold text-base text-slate-900">{topVendedor.nombre}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  <span className="font-bold text-amber-800">{topVendedor.unidades} laptops</span> • {formatCurrency(topVendedor.totalVentas)}
                </p>
                <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                  Ganó: {formatCurrency(topVendedor.ingresoTotal)} en incentivos
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-2">Aún no hay ventas registradas este mes.</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 text-2xl font-black">
            👑
          </div>
        </div>

      </div>

      {/* Gráfico de Evolución de Ventas en el Mes */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Evolución de Ventas por Día</h2>
            <p className="text-xs text-slate-500">Comportamiento diario de laptops vendidas y facturación en soles</p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <span className="text-slate-600 font-medium">Laptops (Unidades)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 font-medium">Facturación (S/)</span>
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {evolucionDiaria.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucionDiaria} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dia" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(val, name) => [
                    name === 'unidades' ? `${val} unidades` : formatCurrency(val), 
                    name === 'unidades' ? 'Laptops' : 'Total Venta'
                  ]}
                  labelFormatter={(dia) => `Día ${dia} de ${getMonthName(monthYear)}`}
                />
                <Area type="monotone" dataKey="unidades" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentas)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              No hay datos para graficar en este periodo.
            </div>
          )}
        </div>
      </div>

      {/* Resumen de Desempeño por Vendedor */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Rendimiento de Vendedores este Mes</h2>
            <p className="text-xs text-slate-500">Seguimiento de cumplimiento de metas y comisiones generadas</p>
          </div>
          <button
            onClick={() => onGoToTab('ranking')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Ver Ranking Completo →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4 text-center">Laptops</th>
                <th className="py-3 px-4 text-right">Total Vendido</th>
                <th className="py-3 px-4 text-right">Comisión Vol.</th>
                <th className="py-3 px-4 text-right">Diferencia Neg.</th>
                <th className="py-3 px-4 text-right">Ingreso Extra Vendedor</th>
                <th className="py-3 px-4 text-center">Meta (25 uds)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendorPerformances.length > 0 ? (
                vendorPerformances.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{v.nombre}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${v.unidades >= 21 ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                        {v.unidades} uds
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {formatCurrency(v.totalVentas)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-purple-700">
                      {formatCurrency(v.comisiones)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-700">
                      {formatCurrency(v.diferencias)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-600 bg-emerald-50/30">
                      {formatCurrency(v.ingresoTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${v.cumplimiento >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(100, v.cumplimiento)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600">{v.cumplimiento}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Aún no hay vendedores registrados en el sistema. Puedes registrarlos en <span className="font-semibold text-blue-600">Gestión de Vendedores</span>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
