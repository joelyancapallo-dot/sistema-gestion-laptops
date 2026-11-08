import React, { useState } from 'react';
import { 
  Trophy, 
  Sparkles, 
  CheckCircle2, 
  Flame, 
  Gift, 
  ArrowUpRight, 
  Clock, 
  AlertCircle,
  HelpCircle,
  Laptop,
  UserCheck,
  ShieldCheck,
  ArrowRightLeft
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function VendorPortalView({ 
  vendorMetrics, 
  currentUser, 
  laptops = [], 
  sales = [], 
  onNewSaleClick 
}) {
  if (!vendorMetrics) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        Cargando perfil y métricas comerciales...
      </div>
    );
  }

  // Laptops bajo la custodia física del vendedor
  const myLaptopsInStock = laptops.filter(l => l.responsable_id === currentUser.id && l.estado === 'disponible');
  const myLaptopsSoldByOthers = sales.filter(s => 
    s.responsable_laptop_id === currentUser.id && 
    s.vendedor_id !== currentUser.id &&
    ['pagada', 'entregada'].includes(s.estado)
  );

  const {
    totalUnits,
    totalSalesAmount,
    totalCommission,
    totalNegotiationDiff,
    totalVendorIncome,
    currentRatePerUnit,
    currentTierName,
    isRetroactiveActive,
    nextMilestone,
    unitsToNext,
    milestoneProgress = [],
    motivationAlert
  } = vendorMetrics;

  return (
    <div className="space-y-6">
      
      {/* Alerta Motivacional de Proximidad al Salto Retroactivo */}
      {motivationAlert && (
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${
          motivationAlert.type === 'super_reward'
            ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-400/40 text-amber-950'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-start space-x-3.5">
            <div className={`p-2.5 rounded-xl ${motivationAlert.type === 'super_reward' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-blue-600 text-white'}`}>
              <Flame className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight">{motivationAlert.title}</h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white">
                  ¡Gran Oportunidad!
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-1 text-slate-700 leading-relaxed">
                {motivationAlert.message}
              </p>
              <div className="mt-3 flex items-center space-x-3">
                {currentUser?.rol === 'admin' ? (
                  <button
                    onClick={onNewSaleClick}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition-colors"
                  >
                    Registrar Laptop Vendida Ahora
                  </button>
                ) : (
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold">
                    📌 Las ventas son aprobadas y registradas por Administración
                  </span>
                )}
                <span className="text-xs text-amber-900/80 font-medium">
                  Solo {motivationAlert.unitsRemaining} unidad{motivationAlert.unitsRemaining > 1 ? 'es' : ''} más para desbloquearlo.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta de Resumen Personal de Ingresos Extra */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mi Rendimiento Mensual</span>
            <h1 className="text-2xl font-black text-slate-900 mt-0.5">{currentUser.nombre}</h1>
            <p className="text-xs text-slate-500">Tus ingresos se calculan 100% sobre tus ventas y negociaciones.</p>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 ${
              isRetroactiveActive 
                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>{currentTierName}</span>
            </div>
          </div>
        </div>

        {/* 3 Indicadores Clave del Vendedor */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          
          {/* Total Ingresos Adicionales Ganados */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md shadow-emerald-600/10 flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Total Ingresos Extra</span>
            <div className="my-2">
              <span className="text-3xl font-black">{formatCurrency(totalVendorIncome)}</span>
            </div>
            <p className="text-xs text-emerald-100/90 font-medium">
              Suma de tu comisión por volumen + diferencias ganadas
            </p>
          </div>

          {/* Comisiones Acumuladas */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Comisión por Volumen</span>
              <Gift className="w-4 h-4 text-purple-600" />
            </div>
            <div className="my-2">
              <span className="text-2xl font-extrabold text-slate-900">{formatCurrency(totalCommission)}</span>
            </div>
            <div className="text-xs text-slate-500">
              Tarifa actual: <span className="font-bold text-purple-700">S/ {currentRatePerUnit} por laptop</span>
              {isRetroactiveActive && <span className="ml-1 text-[10px] text-purple-600 font-semibold">(Retroactivo)</span>}
            </div>
          </div>

          {/* Diferencias por Negociación Ganadas */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Diferencia de Negociación</span>
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
            </div>
            <div className="my-2">
              <span className="text-2xl font-extrabold text-slate-900">{formatCurrency(totalNegotiationDiff)}</span>
            </div>
            <p className="text-xs text-slate-500">
              100% de la ganancia por vender por encima del precio mínimo
            </p>
          </div>

        </div>

        {/* Datos Complementarios */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Laptops Vendidas:</span>
            <span className="font-bold text-slate-800 text-sm">{totalUnits} unidades</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Total Vendido (Soles):</span>
            <span className="font-bold text-slate-800 text-sm">{formatCurrency(totalSalesAmount)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Próximo Hito:</span>
            <span className="font-bold text-blue-600 text-sm">{nextMilestone ? `${nextMilestone} laptops` : 'Máximo alcanzado'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Faltan para Siguiente Nivel:</span>
            <span className="font-bold text-amber-600 text-sm">{unitsToNext > 0 ? `${unitsToNext} laptops` : '¡Completado!'}</span>
          </div>
        </div>
      </div>

      {/* Barra de Progreso hacia los Hitos (21, 25, 30, 40, 50 laptops) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Camino a la Excelencia Comercial</h2>
            <p className="text-xs text-slate-500">Progreso mensual hacia los hitos de 21, 25, 30, 40 y 50 laptops vendidas</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-900">{totalUnits} de 50 laptops</span>
            <span className="text-[11px] text-slate-400 block">Capacidad mensual</span>
          </div>
        </div>

        {/* Tarjetas de Hitos individuales con barra de avance */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {milestoneProgress.map((m) => {
            const isRetroactiveMilestone = m.target === 21;
            return (
              <div 
                key={m.target}
                className={`p-3.5 rounded-xl border transition-all ${
                  m.reached 
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' 
                    : isRetroactiveMilestone && m.remaining <= 3
                      ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm animate-pulse'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black tracking-tight">{m.target} Laptops</span>
                  {m.reached ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600">
                      -{m.remaining}
                    </span>
                  )}
                </div>

                <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden my-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${m.reached ? 'bg-emerald-500' : isRetroactiveMilestone ? 'bg-amber-500' : 'bg-blue-600'}`}
                    style={{ width: `${m.percent}%` }}
                  />
                </div>

                <div className="text-[10px] text-slate-500 font-medium leading-tight">
                  {isRetroactiveMilestone ? (
                    <span className="text-amber-800 font-bold block">★ Salto a S/ 50 c/u</span>
                  ) : (
                    <span>Meta de volumen</span>
                  )}
                  <span>{m.reached ? '¡Hito Conquistado!' : `${m.percent}% alcanzado`}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explicación de la Regla de Negociación y Comisión */}
        <div className="mt-5 p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start space-x-3 text-xs text-blue-900">
          <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">¿Cómo se calculan tus ingresos comerciales?</p>
            <p className="text-blue-800/90 leading-relaxed">
              1. <strong>Diferencia de negociación:</strong> Si vendes una laptop por encima del precio mínimo establecido en catálogo, <span className="font-semibold underline">el 100% de ese excedente es tuyo</span>.
            </p>
            <p className="text-blue-800/90 leading-relaxed">
              2. <strong>Comisión retroactiva:</strong> De 1 a 20 laptops recibes S/ 25 por cada una. A partir de la laptop 21, <span className="font-semibold underline">todas las laptops que vendiste en el mes pasan a recibir S/ 50 cada una</span> (ganando automáticamente S/ 1,050 al llegar a la venta 21).
            </p>
          </div>
        </div>

      </div>

      {/* Control de Responsabilidad y Custodia Física en Stand / Vitrina */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Mi Inventario Físico en Custodia (Stand / Vitrina)
              </h2>
              <p className="text-xs text-slate-500">
                Laptops recibidas y registradas a tu cargo físico
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold">
              {myLaptopsInStock.length} equipos en tu stand
            </span>
          </div>
        </div>

        {/* Resumen de Custodia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[11px]">Equipos Disponibles a tu Cargo:</span>
              <span className="font-extrabold text-base text-slate-900">{myLaptopsInStock.length} unidades</span>
            </div>
            <Laptop className="w-6 h-6 text-indigo-500" />
          </div>

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-amber-800 block text-[11px] font-medium">De tu stand vendidas por compañeros:</span>
              <span className="font-extrabold text-base text-amber-950">{myLaptopsSoldByOthers.length} ventas cruzadas</span>
            </div>
            <ArrowRightLeft className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        {/* Regla Confirmada Informativa */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
          💡 <strong>Regla del Sistema:</strong> La responsabilidad física de cada laptop pertenece al vendedor que la recibe a su cargo, independientemente de quién concrete la venta. Si un cliente llega al stand de un compañero y este concreta la venta, el sistema acredita la venta y comisión a tu compañero, pero mantiene tu registro como el custodio físico del equipo hasta ese momento.
        </div>

        {/* Lista de laptops a cargo */}
        {myLaptopsInStock.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Equipo</th>
                  <th className="py-2.5 px-3">Serie</th>
                  <th className="py-2.5 px-3 text-center">Condición</th>
                  <th className="py-2.5 px-3 text-right">Precio Mínimo</th>
                  <th className="py-2.5 px-3 text-right">Precio Sugerido</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {myLaptopsInStock.map(lap => (
                  <tr key={lap.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {lap.marca} {lap.modelo}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {lap.numero_serie}
                    </td>
                    <td className="py-2.5 px-3 text-center uppercase text-[10px]">
                      <span className={`px-2 py-0.5 rounded font-bold ${lap.condicion === 'nueva' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {lap.condicion}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                      {formatCurrency(lap.precio_minimo)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-blue-600">
                      {formatCurrency(lap.precio_sugerido)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                        En Stand
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-xs text-slate-400 py-4">
            No tienes laptops asignadas en tu stand actualmente.
          </p>
        )}
      </div>

    </div>
  );
}
