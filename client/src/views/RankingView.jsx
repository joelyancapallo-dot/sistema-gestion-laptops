import React from 'react';
import { Trophy, Medal, Award, Flame, ArrowUpRight, Gift, Sparkles } from 'lucide-react';
import { formatCurrency, getMonthName } from '../utils/formatters';

export default function RankingView({ rankingData }) {
  if (!rankingData) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        Cargando tabla de posiciones comerciales...
      </div>
    );
  }

  const monthYear = rankingData.monthYear || '';
  const ranking = Array.isArray(rankingData) 
    ? rankingData 
    : (Array.isArray(rankingData.ranking) ? rankingData.ranking : []);
  const primerLugar = rankingData.primerLugar || ranking[0] || null;
  const segundoLugar = rankingData.segundoLugar || ranking[1] || null;
  const tercerLugar = rankingData.tercerLugar || ranking[2] || null;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Ranking Mensual de Vendedores
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tabla oficial de posiciones por laptops vendidas e ingresos adicionales en <span className="font-semibold text-blue-600">{getMonthName(monthYear)}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Actualización en tiempo real</span>
        </div>
      </div>

      {/* PODIO VISUAL (1°, 2°, 3° Lugar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
        
        {/* 2do Lugar (Plata) */}
        {segundoLugar ? (
          <div className="bg-gradient-to-b from-slate-100 to-slate-200/90 rounded-2xl p-5 border border-slate-300 text-center shadow-sm order-2 md:order-1 flex flex-col justify-between h-72">
            <div>
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-300 flex items-center justify-center text-slate-700 font-black text-xl shadow">
                🥈
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mt-2">
                2° Puesto • Medalla de Plata
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">{segundoLugar.nombre}</h3>
              <p className="text-xs text-slate-600">{segundoLugar.nivelComision}</p>
            </div>

            <div className="p-3 bg-white/70 rounded-xl mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Laptops Vendidas:</span>
                <span className="font-black text-slate-900">{segundoLugar.laptopsVendidas} uds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Comisión Volumen:</span>
                <span className="font-bold text-purple-700">{formatCurrency(segundoLugar.comisionesAcumuladas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Diferencias Neg.:</span>
                <span className="font-bold text-amber-700">{formatCurrency(segundoLugar.diferenciasNegociacion)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-extrabold text-emerald-700">
                <span>Ingreso Extra:</span>
                <span>{formatCurrency(segundoLugar.totalIngresosAdicionales)}</span>
              </div>
            </div>
          </div>
        ) : <div className="hidden md:block"></div>}

        {/* 1er Lugar (Oro - Corona) */}
        {primerLugar ? (
          <div className="bg-gradient-to-b from-amber-100 via-amber-50 to-amber-200/80 rounded-2xl p-6 border-2 border-amber-400 text-center shadow-lg shadow-amber-500/10 order-1 md:order-2 flex flex-col justify-between h-84 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow">
              👑 Campeón de Ventas
            </div>
            
            <div className="mt-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-400/80 flex items-center justify-center text-amber-950 font-black text-3xl shadow-md border-2 border-white">
                🥇
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 block mt-2">
                1° Puesto • Medalla de Oro
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">{primerLugar.nombre}</h3>
              <p className="text-xs font-semibold text-purple-700">{primerLugar.nivelComision}</p>
            </div>

            <div className="p-3.5 bg-white rounded-xl mt-3 space-y-1.5 text-xs shadow-sm">
              <div className="flex justify-between font-bold">
                <span className="text-slate-600">Laptops Vendidas:</span>
                <span className="text-sm font-black text-amber-900">{primerLugar.laptopsVendidas} uds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Facturado:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(primerLugar.totalVendidoSoles)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Comisión Volumen:</span>
                <span className="font-bold text-purple-700">{formatCurrency(primerLugar.comisionesAcumuladas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Diferencias Negociadas:</span>
                <span className="font-bold text-amber-700">+{formatCurrency(primerLugar.diferenciasNegociacion)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-100 font-black text-emerald-600 text-sm">
                <span>Ingreso Extra Ganado:</span>
                <span>{formatCurrency(primerLugar.totalIngresosAdicionales)}</span>
              </div>
            </div>
          </div>
        ) : <div className="hidden md:block"></div>}

        {/* 3er Lugar (Bronce) */}
        {tercerLugar ? (
          <div className="bg-gradient-to-b from-orange-50 to-amber-100/60 rounded-2xl p-5 border border-amber-300 text-center shadow-sm order-3 flex flex-col justify-between h-64">
            <div>
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-700/20 flex items-center justify-center text-amber-800 font-black text-xl shadow">
                🥉
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mt-2">
                3° Puesto • Medalla de Bronce
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">{tercerLugar.nombre}</h3>
              <p className="text-xs text-slate-500">{tercerLugar.nivelComision}</p>
            </div>

            <div className="p-3 bg-white/70 rounded-xl mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Laptops Vendidas:</span>
                <span className="font-black text-slate-900">{tercerLugar.laptopsVendidas} uds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Comisión Volumen:</span>
                <span className="font-bold text-purple-700">{formatCurrency(tercerLugar.comisionesAcumuladas)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-extrabold text-emerald-700">
                <span>Ingreso Extra:</span>
                <span>{formatCurrency(tercerLugar.totalIngresosAdicionales)}</span>
              </div>
            </div>
          </div>
        ) : <div className="hidden md:block"></div>}

      </div>

      {/* Tabla Completa del Ranking */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Tabla General de Posiciones Comerciales</h2>
          <p className="text-xs text-slate-500">Desglose de unidades, facturación, comisiones y diferencias de todos los vendedores</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                <th className="py-3 px-4 text-center">Posición</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4 text-center">Laptops Vendidas</th>
                <th className="py-3 px-4 text-right">Facturado (S/)</th>
                <th className="py-3 px-4 text-right text-purple-700">Comisión Acumulada</th>
                <th className="py-3 px-4 text-right text-amber-700">Diferencia Negociación</th>
                <th className="py-3 px-4 text-right text-emerald-700 bg-emerald-50/50">Total Ganado Vendedor</th>
                <th className="py-3 px-4 text-center">Tarifa Activa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranking.length > 0 ? (
                ranking.map((v) => (
                  <tr key={v.vendedorId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                        v.posicion === 1 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                        v.posicion === 2 ? 'bg-slate-300 text-slate-800' :
                        v.posicion === 3 ? 'bg-amber-700/30 text-amber-900' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {v.posicion}°
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{v.nombre}</div>
                      <div className="text-[10px] text-slate-400">{v.email}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full font-black text-xs ${
                        v.laptopsVendidas >= 21 ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {v.laptopsVendidas} uds
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {formatCurrency(v.totalVendidoSoles)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-purple-700">
                      {formatCurrency(v.comisionesAcumuladas)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-700">
                      +{formatCurrency(v.diferenciasNegociacion)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600 bg-emerald-50/30 text-sm">
                      {formatCurrency(v.totalIngresosAdicionales)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-700">
                        S/ {v.tarifaUnitaria}/u
                      </span>
                      {v.esRetroactivo && (
                        <span className="block text-[9px] font-bold text-purple-600">RETROACTIVO</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm">Aún no hay vendedores o ventas registradas en este periodo.</p>
                    <p className="text-xs text-slate-400 mt-1">Registra tus primeros vendedores y ventas para visualizar el ranking y el podio de campeones.</p>
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
