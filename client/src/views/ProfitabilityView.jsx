import React, { useState } from 'react';
import { 
  TrendingUp, 
  PiggyBank, 
  DollarSign, 
  ArrowDownRight, 
  ArrowUpRight, 
  Sliders, 
  Plus, 
  Calendar, 
  Sparkles,
  PieChart as PieIcon,
  HelpCircle
} from 'lucide-react';
import { formatCurrency, formatPercent, getMonthName, formatDate, getLocalDateString } from '../utils/formatters';

export default function ProfitabilityView({ 
  profitData, 
  expenses = [], 
  onAddExpense, 
  onRefresh 
}) {
  const [savingsPerUnit, setSavingsPerUnit] = useState(100); // S/ 100 por laptop compra distribuidor
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    concepto: '',
    categoria: 'alquiler',
    monto: '',
    fecha: getLocalDateString()
  });

  if (!profitData) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        Cargando análisis de rentabilidad real...
      </div>
    );
  }

  const {
    periodo,
    resumenFinanciero = {},
    simuladorDistribuidor = {},
    historialMeses = [],
    productosMasVendidos = []
  } = profitData;

  const totalUnidades = simuladorDistribuidor.unidadesVendidas || 0;
  const gananciaActual = resumenFinanciero.gananciaNetaRestante || 0;

  // Cálculo en vivo del Simulador interactivo
  const ahorroTotalInteractivo = totalUnidades * savingsPerUnit;
  const gananciaSimuladaInteractiva = gananciaActual + ahorroTotalInteractivo;
  const incrementoPorcentualInteractivo = gananciaActual > 0 
    ? Math.round((ahorroTotalInteractivo / gananciaActual) * 100) 
    : 0;

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.concepto || !expenseForm.monto) {
      alert('Por favor completa concepto y monto.');
      return;
    }
    try {
      await onAddExpense({
        ...expenseForm,
        monto: parseFloat(expenseForm.monto)
      });
      setIsExpenseModalOpen(false);
      setExpenseForm({
        concepto: '',
        categoria: 'alquiler',
        monto: '',
        fecha: getLocalDateString()
      });
      onRefresh();
    } catch (err) {
      alert('Error guardando gasto: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Control de Rentabilidad Real del Negocio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Separación estricta de costos, gastos operativos, comisiones e incentivos en <span className="font-semibold text-blue-600">{getMonthName(periodo)}</span>
          </p>
        </div>

        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Gasto Operativo</span>
        </button>
      </div>

      {/* ESTADO DE RESULTADOS: CASCADA FINANCIERA */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-1">
          Cascada Financiera de Rentabilidad Real (P&L)
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Demostración matemática de cómo el dinero facturado se distribuye entre costos de adquisición, incentivos y ganancia neta del dueño.
        </p>

        <div className="space-y-3 text-xs sm:text-sm">
          
          {/* 1. Ingreso Total Ventas */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80">
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">1</span>
              <div>
                <span className="font-extrabold text-blue-950">Ingreso Bruto por Ventas de Laptops</span>
                <span className="block text-[11px] text-blue-700">Total facturado a clientes</span>
              </div>
            </div>
            <span className="font-black text-base text-blue-950">
              {formatCurrency(resumenFinanciero.ingresoTotalVentas)}
            </span>
          </div>

          {/* 2. (-) Costo de Adquisición y Gastos */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 pl-8">
            <div className="flex items-center space-x-2 text-slate-600">
              <span className="text-red-500 font-bold text-sm">(-)</span>
              <div>
                <span className="font-semibold text-slate-800">Costo Total de Equipos (Compra + Gastos de Adquisición)</span>
                <span className="block text-[11px] text-slate-400">Inversión en laptops nuevas y seminuevas</span>
              </div>
            </div>
            <span className="font-bold text-slate-700">
              -{formatCurrency(resumenFinanciero.costoTotalEquipos)}
            </span>
          </div>

          {/* 3. (=) Margen Bruto Comercial */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/80 border border-slate-200 pl-8 font-bold">
            <span className="text-slate-800">(=) Margen Bruto Comercial</span>
            <span className="text-slate-900">{formatCurrency(resumenFinanciero.margenBrutoComercial)}</span>
          </div>

          {/* 4. (-) Diferencias Entregadas a Vendedores */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 pl-8">
            <div className="flex items-center space-x-2 text-amber-900">
              <span className="text-amber-600 font-bold text-sm">(-)</span>
              <div>
                <span className="font-bold">Diferencias de Negociación (100% para Vendedores)</span>
                <span className="block text-[11px] text-amber-700">Sobreprecio negociado por encima del catálogo mínimo</span>
              </div>
            </div>
            <span className="font-bold text-amber-800">
              -{formatCurrency(resumenFinanciero.diferenciasEntregadasVendedores)}
            </span>
          </div>

          {/* 5. (=) Ganancia Base del Negocio */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 pl-8 font-bold text-indigo-950">
            <div>
              <span>(=) Ganancia Base del Negocio (Catálogo)</span>
              <span className="block text-[11px] text-indigo-700 font-normal">Precio mínimo establecido menos costo total</span>
            </div>
            <span className="font-black text-indigo-900">{formatCurrency(resumenFinanciero.gananciaBaseNegocio)}</span>
          </div>

          {/* 6. (-) Comisiones por Volumen Pagadas */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 border border-purple-200/70 pl-8">
            <div className="flex items-center space-x-2 text-purple-900">
              <span className="text-purple-600 font-bold text-sm">(-)</span>
              <div>
                <span className="font-bold">Comisiones por Volumen Pagadas (Retroactivas)</span>
                <span className="block text-[11px] text-purple-700">S/ 25 o S/ 50 por cada unidad mensual</span>
              </div>
            </div>
            <span className="font-bold text-purple-800">
              -{formatCurrency(resumenFinanciero.comisionesVolumenPagadas)}
            </span>
          </div>

          {/* 7. (-) Otros Gastos Operativos del Negocio */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 pl-8">
            <div className="flex items-center space-x-2 text-slate-600">
              <span className="text-red-500 font-bold text-sm">(-)</span>
              <div>
                <span className="font-semibold text-slate-800">Otros Gastos Operativos del Mes</span>
                <span className="block text-[11px] text-slate-400">Alquiler local, servicios de luz/internet, publicidad</span>
              </div>
            </div>
            <span className="font-bold text-slate-700">
              -{formatCurrency(resumenFinanciero.gastosOperativos)}
            </span>
          </div>

          {/* 8. (=) GANANCIA NETA RESTANTE DEL NEGOCIO */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/20">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-100 block">
                (=) Utilidad Neta Restante para el Propietario
              </span>
              <span className="text-base sm:text-lg font-black">
                Ganancia Neta Real del Negocio
              </span>
              <span className="block text-xs text-emerald-100 mt-0.5">
                Margen neto sobre ventas: {resumenFinanciero.margenNetoPorcentual}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black">
                {formatCurrency(resumenFinanciero.gananciaNetaRestante)}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* SIMULADOR INTERACTIVO: COMPRA DIRECTA A DISTRIBUIDORES */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black tracking-tight text-white">
                Simulador de Compra Directa a Distribuidores
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Proyecta cómo se disparará tu rentabilidad al comprar directamente a distribuidores con mayor margen
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold">
            Objetivo Estratégico
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          
          {/* Controles de Simulación */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-bold">
                <span className="text-slate-300">Ahorro proyectado por laptop:</span>
                <span className="text-amber-400 font-extrabold text-sm">S/ {savingsPerUnit}.00 / equipo</span>
              </div>
              <input 
                type="range"
                min="30"
                max="250"
                step="10"
                value={savingsPerUnit}
                onChange={(e) => setSavingsPerUnit(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>S/ 30 (Mínimo)</span>
                <span className="text-amber-300 font-bold">S/ 100 (Meta Distribuidor)</span>
                <span>S/ 250 (Directo Fábrica)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Laptops Vendidas en el Periodo:</span>
                <span className="font-bold text-white">{totalUnidades} unidades</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ahorro Neto Total Proyectado:</span>
                <span className="font-extrabold text-amber-400">+{formatCurrency(ahorroTotalInteractivo)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10">
                <span className="text-slate-400">Incremento de Utilidad:</span>
                <span className="font-extrabold text-emerald-400">+{incrementoPorcentualInteractivo}% extra</span>
              </div>
            </div>
          </div>

          {/* Comparativa Visual: Antes vs Con Distribuidores */}
          <div className="grid grid-cols-2 gap-3 text-center">
            
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Utilidad Neta Actual</span>
              <div className="my-3">
                <span className="text-xl sm:text-2xl font-black text-slate-200">{formatCurrency(gananciaActual)}</span>
              </div>
              <span className="text-[11px] text-slate-400">Con proveedores actuales</span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border-2 border-amber-400/60 flex flex-col justify-between shadow-lg">
              <span className="text-[10px] font-bold uppercase text-amber-300">Con Distribuidores Directos</span>
              <div className="my-3">
                <span className="text-xl sm:text-2xl font-black text-amber-300">{formatCurrency(gananciaSimuladaInteractiva)}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-300">
                +{formatCurrency(ahorroTotalInteractivo)} más de bolsillo
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* Gastos Operativos del Mes */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Gastos Operativos Registrados este Mes</h3>
            <p className="text-xs text-slate-500">Alquiler, servicios y costos fijos que se descuentan para la utilidad neta</p>
          </div>
          <span className="font-extrabold text-sm text-slate-900">
            Total Gastos: {formatCurrency(resumenFinanciero.gastosOperativos)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Concepto</th>
                <th className="py-2.5 px-3">Categoría</th>
                <th className="py-2.5 px-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length > 0 ? (
                expenses.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-500">{formatDate(g.fecha)}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{g.concepto}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-700">
                        {g.categoria}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600">
                      -{formatCurrency(g.monto)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    No se han registrado gastos operativos para este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR GASTO OPERATIVO */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Registrar Gasto Operativo</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleCreateExpense} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Concepto del Gasto *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Pago de alquiler de tienda comercial"
                  value={expenseForm.concepto}
                  onChange={(e) => setExpenseForm({ ...expenseForm, concepto: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Categoría</label>
                  <select
                    value={expenseForm.categoria}
                    onChange={(e) => setExpenseForm({ ...expenseForm, categoria: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="alquiler">Alquiler</option>
                    <option value="servicios">Servicios (Luz/Internet)</option>
                    <option value="publicidad">Publicidad y Marketing</option>
                    <option value="mantenimiento">Mantenimiento y Útiles</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Monto (S/) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={expenseForm.monto}
                    onChange={(e) => setExpenseForm({ ...expenseForm, monto: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Fecha</label>
                <input 
                  type="date"
                  value={expenseForm.fecha}
                  onChange={(e) => setExpenseForm({ ...expenseForm, fecha: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
