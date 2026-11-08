import React, { useState, useEffect } from 'react';
import { 
  FileText, Printer, Download, TrendingUp, TrendingDown, Users, 
  Laptop, DollarSign, Award, Percent, Calendar, ShieldCheck
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent, getMonthName } from '../utils/formatters';
import { exportToExcel } from '../utils/exportExcel';

export function MonthlyReportView({ currentMonth, currentUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/monthly?periodo=${currentMonth}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error cargando reporte mensual:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [currentMonth]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!data) return;

    // Hoja 1: Resumen General
    const summaryRows = [
      { Métrica: 'Periodo Evaluado', Valor: currentMonth },
      { Métrica: 'Total Laptops Vendidas', Valor: data.resumen.laptopsVendidas },
      { Métrica: 'Ventas Totales Facturadas', Valor: data.resumen.totalVentas },
      { Métrica: 'Costo de Adquisición', Valor: data.resumen.costoTotal },
      { Métrica: 'Gastos de Adquisición', Valor: data.resumen.gastosAdquisicionTotal },
      { Métrica: 'Ganancia Bruta Base', Valor: data.resumen.gananciaBrutaBase },
      { Métrica: 'Comisiones Pagadas por Volumen', Valor: data.resumen.comisionesTotal },
      { Métrica: 'Diferencias Entregadas a Vendedores', Valor: data.resumen.diferenciasTotal },
      { Métrica: 'Gastos Operativos', Valor: data.resumen.gastosOperativos },
      { Métrica: 'Ganancia Neta Restante', Valor: data.resumen.gananciaNeta },
      { Métrica: 'Margen Neto %', Valor: `${data.resumen.margenNetoPercent.toFixed(2)}%` },
      { Métrica: 'Crecimiento de Ventas vs Mes Anterior %', Valor: `${data.resumen.crecimientoVentasPercent >= 0 ? '+' : ''}${data.resumen.crecimientoVentasPercent.toFixed(1)}%` },
      { Métrica: 'Crecimiento de Unidades vs Mes Anterior %', Valor: `${data.resumen.crecimientoUnidadesPercent >= 0 ? '+' : ''}${data.resumen.crecimientoUnidadesPercent.toFixed(1)}%` }
    ];

    // Hoja 2: Vendedores
    const vendorRows = (data.porVendedor || []).map(v => ({
      Vendedor: v.vendedor_nombre,
      Laptops: v.laptops_vendidas,
      Total_Ventas_S: v.total_ventas,
      Comisiones_S: v.comisiones,
      Diferencias_S: v.diferencias,
      Total_Ingresos_Vendedor_S: v.ingreso_total_vendedor,
      Ganancia_Neta_Aportada_S: v.ganancia_para_negocio,
      Ticket_Promedio_S: v.ticket_promedio
    }));

    // Hoja 3: Productos Más Vendidos
    const productRows = (data.topProductos || []).map(p => ({
      Marca: p.marca,
      Modelo: p.modelo,
      Condicion: p.condicion,
      Unidades_Vendidas: p.unidades_vendidas,
      Ingreso_Total_S: p.ingreso_total,
      Ganancia_Base_S: p.ganancia_base_total
    }));

    exportToExcel(
      [
        { name: 'Resumen Ejecutivo', data: summaryRows },
        { name: 'Vendedores', data: vendorRows },
        { name: 'Productos Top', data: productRows }
      ],
      `Reporte_Mensual_${currentMonth}`
    );
  };

  if (loading || !data || !data.resumen) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { resumen, porVendedor, comparativaHistorica, topProductos } = data;

  return (
    <div className="space-y-6">
      {/* Botonera superior (Oculta al imprimir) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <FileText className="w-3.5 h-3.5" />
            Auditoría & Desempeño Comercial
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Informe Gerencial Mensual — {getMonthName(currentMonth)}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consolidado oficial de ventas, incentivos y rentabilidad real del negocio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar en PDF
          </button>
        </div>
      </div>

      {/* ÁREA DE IMPRESIÓN / REPORTE OFICIAL */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 space-y-8">
        
        {/* Cabecera del Documento */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                TL
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Tienda Laptops — Comercializadora & Distribución
                </h2>
                <p className="text-xs text-slate-500">
                  RUC: 20608945123 • Lima, Perú • Tel: +51 987 654 321
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs uppercase tracking-wider mb-1">
              Informe Mensual Cerrado
            </span>
            <div className="text-xs text-slate-500 font-medium">
              Periodo Fiscal: <strong className="text-slate-800">{currentMonth}</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Emitido el: {new Date().toLocaleDateString('es-PE')}
            </div>
          </div>
        </div>

        {/* 1. Métricas Principales (KPIs) */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            1. Resumen Ejecutivo del Periodo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Laptops Vendidas</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatNumber(resumen.laptopsVendidas)} <span className="text-xs font-normal text-slate-500">und.</span>
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                {resumen.crecimientoUnidadesPercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
                <span>{resumen.crecimientoUnidadesPercent >= 0 ? '+' : ''}{resumen.crecimientoUnidadesPercent.toFixed(1)}% vs mes ant.</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Ventas Facturadas</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(resumen.totalVentas)}
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                {resumen.crecimientoVentasPercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
                <span>{resumen.crecimientoVentasPercent >= 0 ? '+' : ''}{resumen.crecimientoVentasPercent.toFixed(1)}% crecimiento</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Incentivos a Vendedores</div>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {formatCurrency(resumen.comisionesTotal + resumen.diferenciasTotal)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Com: {formatCurrency(resumen.comisionesTotal)} | Dif: {formatCurrency(resumen.diferenciasTotal)}
              </div>
            </div>

            <div className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-100">
              <div className="text-xs text-indigo-700 font-semibold">Utilidad Neta Negocio</div>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {formatCurrency(resumen.gananciaNeta)}
              </div>
              <div className="text-xs text-indigo-700 font-medium mt-1">
                Margen Neto: <strong>{resumen.margenNetoPercent.toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Rendimiento y Liquidación por Vendedor */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            2. Desempeño y Liquidación Individual de Vendedores
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                <tr>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3 text-center">Unidades</th>
                  <th className="p-3 text-right">Venta Total</th>
                  <th className="p-3 text-right">Comisión Volumen</th>
                  <th className="p-3 text-right">Diferencia Negoc.</th>
                  <th className="p-3 text-right text-emerald-700">Total Vendedor</th>
                  <th className="p-3 text-right text-indigo-700">Utilidad Aportada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {porVendedor.map((v, idx) => (
                  <tr key={v.vendedor_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="p-3 font-bold text-slate-800">{v.vendedor_nombre}</td>
                    <td className="p-3 text-center font-bold text-slate-700">{v.laptops_vendidas} und.</td>
                    <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(v.total_ventas)}</td>
                    <td className="p-3 text-right font-semibold text-rose-600">{formatCurrency(v.comisiones)}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600">{formatCurrency(v.diferencias)}</td>
                    <td className="p-3 text-right font-black text-emerald-700">{formatCurrency(v.ingreso_total_vendedor)}</td>
                    <td className="p-3 text-right font-black text-indigo-700">{formatCurrency(v.ganancia_para_negocio)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t border-slate-200">
                <tr>
                  <td className="p-3">TOTALES</td>
                  <td className="p-3 text-center">{resumen.laptopsVendidas} und.</td>
                  <td className="p-3 text-right">{formatCurrency(resumen.totalVentas)}</td>
                  <td className="p-3 text-right text-rose-600">{formatCurrency(resumen.comisionesTotal)}</td>
                  <td className="p-3 text-right text-emerald-600">{formatCurrency(resumen.diferenciasTotal)}</td>
                  <td className="p-3 text-right text-emerald-800">
                    {formatCurrency(resumen.comisionesTotal + resumen.diferenciasTotal)}
                  </td>
                  <td className="p-3 text-right text-indigo-800">
                    {formatCurrency(porVendedor.reduce((acc, v) => acc + parseFloat(v.ganancia_para_negocio || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 3. Comparativa con Meses Anteriores */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            3. Comparativa y Tendencia Histórica (Últimos Meses)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                <tr>
                  <th className="p-3">Periodo</th>
                  <th className="p-3 text-center">Laptops</th>
                  <th className="p-3 text-right">Venta Total</th>
                  <th className="p-3 text-right">Comisiones</th>
                  <th className="p-3 text-right">Utilidad Neta</th>
                  <th className="p-3 text-right">Crecimiento MoM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparativaHistorica.map((m) => (
                  <tr key={m.periodo} className={m.periodo === currentMonth ? 'bg-blue-50/50 font-semibold' : 'bg-white'}>
                    <td className="p-3 font-bold text-slate-800">
                      {m.periodo} {m.periodo === currentMonth && <span className="text-[10px] text-blue-600 font-bold uppercase">(Actual)</span>}
                    </td>
                    <td className="p-3 text-center">{m.laptops} und.</td>
                    <td className="p-3 text-right">{formatCurrency(m.ventas)}</td>
                    <td className="p-3 text-right text-rose-600">{formatCurrency(m.comisiones)}</td>
                    <td className="p-3 text-right font-bold text-indigo-700">{formatCurrency(m.utilidadNeta)}</td>
                    <td className="p-3 text-right">
                      {m.crecimientoPercent !== null ? (
                        <span className={`font-semibold ${m.crecimientoPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {m.crecimientoPercent >= 0 ? '+' : ''}{m.crecimientoPercent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Modelos Más Vendidos */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            4. Modelos de Laptops con Mayor Demanda
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {topProductos.slice(0, 6).map((prod, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{prod.marca} {prod.modelo}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                    {prod.unidades_vendidas} vendidas
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 capitalize mt-1">Condición: {prod.condicion}</div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Ganancia Base:</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(prod.ganancia_base_total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Firmas de Conformidad al pie de página (Especial para impresión PDF) */}
        <div className="pt-12 mt-12 border-t border-slate-300 grid grid-cols-2 gap-12 text-center text-xs text-slate-600">
          <div>
            <div className="border-t border-slate-400 w-48 mx-auto mb-2"></div>
            <div className="font-bold text-slate-800">Administración General</div>
            <div className="text-[11px] text-slate-400">Propietario / Gerente Comercial</div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-48 mx-auto mb-2"></div>
            <div className="font-bold text-slate-800">Control de Comisiones & Nómina</div>
            <div className="text-[11px] text-slate-400">Firma de Conformidad</div>
          </div>
        </div>

      </div>
    </div>
  );
}
