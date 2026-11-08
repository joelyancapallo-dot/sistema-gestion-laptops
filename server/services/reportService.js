const db = require('../db');
const CommissionService = require('./commissionService');

class ReportService {
  /**
   * Métricas en tiempo real para el Panel Principal (Dashboard)
   */
  static async getDashboardMetrics(monthYear) {
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);

    // 1. Obtener todas las ventas válidas del mes
    const salesRes = await db.query(`
      SELECT 
        v.*,
        l.costo_adquisicion,
        l.gastos_adquisicion,
        u.nombre as vendedor_nombre
      FROM ventas v
      JOIN laptops l ON v.laptop_id = l.id
      JOIN usuarios u ON v.vendedor_id = u.id
      WHERE TO_CHAR(v.fecha_venta, 'YYYY-MM') = $1
        AND v.estado IN ('pagada', 'entregada')
      ORDER BY v.fecha_venta ASC;
    `, [targetMonth]);

    const sales = salesRes.rows;
    const totalLaptops = sales.length;

    let totalVentasSoles = 0;
    let totalCostoAdquisicion = 0;
    let totalGastosAdquisicion = 0;
    let totalDiferenciasVendedores = 0;
    let totalGananciaBaseNegocio = 0;

    for (const s of sales) {
      totalVentasSoles += parseFloat(s.precio_venta_final || 0);
      totalCostoAdquisicion += parseFloat(s.costo_adquisicion_hist || s.costo_adquisicion || 0);
      totalGastosAdquisicion += parseFloat(s.gastos_adquisicion_hist || s.gastos_adquisicion || 0);
      totalDiferenciasVendedores += parseFloat(s.diferencia_vendedor || 0);
      totalGananciaBaseNegocio += parseFloat(s.ganancia_base_negocio || 0);
    }

    // 2. Calcular comisiones retroactivas individuales por vendedor
    const vendorsRes = await db.query(`
      SELECT id, nombre, email, meta_mensual_unidades 
      FROM usuarios 
      WHERE rol = 'vendedor' AND activo = TRUE;
    `);

    let totalComisionesAcumuladas = 0;
    const vendorPerformances = [];

    for (const vendor of vendorsRes.rows) {
      const vendorMetrics = await CommissionService.getVendorMonthlyMetrics(vendor.id, targetMonth);
      totalComisionesAcumuladas += vendorMetrics.totalCommission;
      vendorPerformances.push({
        id: vendor.id,
        nombre: vendor.nombre,
        unidades: vendorMetrics.totalUnits,
        totalVentas: vendorMetrics.totalSalesAmount,
        comisiones: vendorMetrics.totalCommission,
        diferencias: vendorMetrics.totalNegotiationDiff,
        ingresoTotal: vendorMetrics.totalVendorIncome,
        meta: vendor.meta_mensual_unidades || 25,
        cumplimiento: Math.min(100, Math.round((vendorMetrics.totalUnits / (vendor.meta_mensual_unidades || 25)) * 100))
      });
    }

    // Ordenar vendedores por unidades vendidas para determinar el Top Vendedor
    vendorPerformances.sort((a, b) => b.unidades - a.unidades || b.totalVentas - a.totalVentas);
    const topVendedor = vendorPerformances.length > 0 && vendorPerformances[0].unidades > 0 
      ? vendorPerformances[0] 
      : null;

    // 3. Gastos operativos del mes (alquiler, luz, etc.)
    const gastosRes = await db.query(`
      SELECT COALESCE(SUM(monto), 0) as total_gastos 
      FROM gastos_operativos 
      WHERE TO_CHAR(fecha, 'YYYY-MM') = $1;
    `, [targetMonth]);

    const otrosGastosOperativos = parseFloat(gastosRes.rows[0].total_gastos || 0);

    // 4. Utilidad restante real del negocio
    // Ganancia Base del Negocio (-) Comisiones pagadas (-) Otros Gastos Operativos
    const gananciaRestanteNegocio = Math.round((totalGananciaBaseNegocio - totalComisionesAcumuladas - otrosGastosOperativos) * 100) / 100;

    // 5. Promedio diario de ventas (días transcurridos o días del mes)
    const [yearStr, monthStr] = targetMonth.split('-');
    const daysInMonth = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
    const now = new Date();
    const isCurrentMonth = targetMonth === now.toISOString().slice(0, 7);
    const daysToCount = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;
    const promedioDiarioVentas = totalLaptops > 0 ? (totalLaptops / daysToCount).toFixed(2) : '0.00';

    // 6. Porcentaje de cumplimiento de meta global (ej: 50 laptops al mes)
    const metaGlobalLaptops = 50;
    const porcentajeCumplimientoMeta = Math.min(100, Math.round((totalLaptops / metaGlobalLaptops) * 100));

    // 7. Gráfico: Evolución diaria de ventas en el mes
    const dailyMap = {};
    for (let d = 1; d <= daysToCount; d++) {
      const dayKey = `${targetMonth}-${String(d).padStart(2, '0')}`;
      dailyMap[dayKey] = { fecha: dayKey, dia: d, unidades: 0, totalSoles: 0, ganancia: 0 };
    }

    for (const s of sales) {
      const dKey = new Date(s.fecha_venta).toISOString().slice(0, 10);
      if (dailyMap[dKey]) {
        dailyMap[dKey].unidades += 1;
        dailyMap[dKey].totalSoles += parseFloat(s.precio_venta_final || 0);
        dailyMap[dKey].ganancia += parseFloat(s.ganancia_base_negocio || 0);
      }
    }

    const evolucionDiaria = Object.values(dailyMap);

    return {
      monthYear: targetMonth,
      totalLaptops,
      totalVentasSoles: Math.round(totalVentasSoles * 100) / 100,
      totalCostoAdquisicion: Math.round(totalCostoAdquisicion * 100) / 100,
      totalGastosAdquisicion: Math.round(totalGastosAdquisicion * 100) / 100,
      costoTotalEquipos: Math.round((totalCostoAdquisicion + totalGastosAdquisicion) * 100) / 100,
      gananciaBrutaBaseNegocio: Math.round(totalGananciaBaseNegocio * 100) / 100,
      totalComisionesAcumuladas: Math.round(totalComisionesAcumuladas * 100) / 100,
      totalDiferenciasVendedores: Math.round(totalDiferenciasVendedores * 100) / 100,
      totalEntregadoVendedores: Math.round((totalComisionesAcumuladas + totalDiferenciasVendedores) * 100) / 100,
      otrosGastosOperativos: Math.round(otrosGastosOperativos * 100) / 100,
      gananciaRestanteNegocio,
      topVendedor,
      promedioDiarioVentas,
      metaGlobalLaptops,
      porcentajeCumplimientoMeta,
      evolucionDiaria,
      vendorPerformances
    };
  }

  /**
   * Ranking Oficial de Vendedores con Podio (1°, 2°, 3° lugar)
   */
  static async getVendorRanking(monthYear) {
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);

    const vendorsRes = await db.query(`
      SELECT id, nombre, email, telefono, meta_mensual_unidades 
      FROM usuarios 
      WHERE rol = 'vendedor' AND activo = TRUE;
    `);

    const ranking = [];

    for (const v of vendorsRes.rows) {
      const metrics = await CommissionService.getVendorMonthlyMetrics(v.id, targetMonth);
      ranking.push({
        vendedorId: v.id,
        nombre: v.nombre,
        email: v.email,
        telefono: v.telefono,
        laptopsVendidas: metrics.totalUnits,
        totalVendidoSoles: metrics.totalSalesAmount,
        comisionesAcumuladas: metrics.totalCommission,
        diferenciasNegociacion: metrics.totalNegotiationDiff,
        totalIngresosAdicionales: metrics.totalVendorIncome,
        tarifaUnitaria: metrics.currentRatePerUnit,
        esRetroactivo: metrics.isRetroactiveActive,
        nivelComision: metrics.currentTierName,
        hitos: metrics.milestoneProgress,
        alerta: metrics.motivationAlert
      });
    }

    // Ordenar por unidades vendidas, luego por monto total vendido
    ranking.sort((a, b) => b.laptopsVendidas - a.laptopsVendidas || b.totalVendidoSoles - a.totalVendidoSoles);

    // Asignar posición y medalla
    const rankedWithPosition = ranking.map((item, index) => ({
      posicion: index + 1,
      esPodio: index < 3,
      medalla: index === 0 ? 'oro' : (index === 1 ? 'plata' : (index === 2 ? 'bronce' : null)),
      ...item
    }));

    return {
      monthYear: targetMonth,
      ranking: rankedWithPosition,
      primerLugar: rankedWithPosition[0] || null,
      segundoLugar: rankedWithPosition[1] || null,
      tercerLugar: rankedWithPosition[2] || null
    };
  }

  /**
   * Estado de Resultados Comercial & Simulador de Compra a Distribuidores (+S/ 100 margen)
   */
  static async getProfitabilityAnalysis(monthYear) {
    const metrics = await this.getDashboardMetrics(monthYear);

    // Simulación: Compra directa a distribuidores con ahorro de S/ 100 por laptop
    const ahorroPorLaptop = 100.00;
    const ahorroTotalSimulado = metrics.totalLaptops * ahorroPorLaptop;
    const gananciaSimuladaRestante = metrics.gananciaRestanteNegocio + ahorroTotalSimulado;
    const incrementoPorcentual = metrics.gananciaRestanteNegocio > 0 
      ? Math.round((ahorroTotalSimulado / metrics.gananciaRestanteNegocio) * 100) 
      : 0;

    // Comparativa con meses anteriores (últimos 6 meses)
    const monthlyHistoryRes = await db.query(`
      SELECT 
        TO_CHAR(v.fecha_venta, 'YYYY-MM') as mes,
        COUNT(v.id) as total_unidades,
        COALESCE(SUM(v.precio_venta_final), 0) as total_ventas,
        COALESCE(SUM(v.diferencia_vendedor), 0) as total_diferencias,
        COALESCE(SUM(v.ganancia_base_negocio), 0) as ganancia_base
      FROM ventas v
      WHERE v.estado IN ('pagada', 'entregada')
      GROUP BY TO_CHAR(v.fecha_venta, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 6;
    `);

    // Laptops más vendidas por marca y modelo
    const bestSellersRes = await db.query(`
      SELECT 
        l.marca,
        l.modelo,
        l.condicion,
        COUNT(v.id) as cantidad_vendida,
        SUM(v.precio_venta_final) as total_recaudado,
        SUM(v.ganancia_base_negocio) as ganancia_generada
      FROM ventas v
      JOIN laptops l ON v.laptop_id = l.id
      WHERE TO_CHAR(v.fecha_venta, 'YYYY-MM') = $1
        AND v.estado IN ('pagada', 'entregada')
      GROUP BY l.marca, l.modelo, l.condicion
      ORDER BY cantidad_vendida DESC, total_recaudado DESC
      LIMIT 10;
    `, [metrics.monthYear]);

    return {
      periodo: metrics.monthYear,
      resumenFinanciero: {
        ingresoTotalVentas: metrics.totalVentasSoles,
        costoTotalEquipos: metrics.costoTotalEquipos,
        margenBrutoComercial: Math.round((metrics.totalVentasSoles - metrics.costoTotalEquipos) * 100) / 100,
        diferenciasEntregadasVendedores: metrics.totalDiferenciasVendedores,
        gananciaBaseNegocio: metrics.gananciaBrutaBaseNegocio,
        comisionesVolumenPagadas: metrics.totalComisionesAcumuladas,
        gastosOperativos: metrics.otrosGastosOperativos,
        gananciaNetaRestante: metrics.gananciaRestanteNegocio,
        margenNetoPorcentual: metrics.totalVentasSoles > 0 
          ? ((metrics.gananciaRestanteNegocio / metrics.totalVentasSoles) * 100).toFixed(1) + '%' 
          : '0.0%'
      },
      simuladorDistribuidor: {
        ahorroUnitarioProyectado: ahorroPorLaptop,
        unidadesVendidas: metrics.totalLaptops,
        ahorroTotalProyectado: ahorroTotalSimulado,
        gananciaNetaActual: metrics.gananciaRestanteNegocio,
        gananciaNetaSimulada: gananciaSimuladaRestante,
        incrementoPorcentual: `${incrementoPorcentual}%`,
        mensajeImpacto: `Comprando directamente a distribuidores con S/ 100 menos de costo por laptop, tu ganancia neta este mes aumentaría en S/ ${ahorroTotalSimulado.toFixed(2)} (+${incrementoPorcentual}% de utilidad extra).`
      },
      historialMeses: monthlyHistoryRes.rows,
      productosMasVendidos: bestSellersRes.rows
    };
  }

  /**
   * Genera el informe mensual consolidado para exportación Excel y PDF
   * Cumple con la sección 10 del requerimiento
   */
  static async getMonthlyExecutiveReport(periodo) {
    const targetPeriod = periodo || new Date().toISOString().slice(0, 7);
    const metrics = await this.getDashboardMetrics(targetPeriod);
    const rankingResult = await this.getVendorRanking(targetPeriod);
    const vendorRankingList = rankingResult.ranking || [];

    // Comparativa histórica de los últimos 6 meses
    const historyRes = await db.query(`
      SELECT 
        TO_CHAR(v.fecha_venta, 'YYYY-MM') as mes,
        COUNT(v.id) as total_unidades,
        COALESCE(SUM(v.precio_venta_final), 0) as total_ventas,
        COALESCE(SUM(v.diferencia_vendedor), 0) as total_diferencias,
        COALESCE(SUM(v.ganancia_base_negocio), 0) as ganancia_base
      FROM ventas v
      WHERE v.estado IN ('pagada', 'entregada')
      GROUP BY TO_CHAR(v.fecha_venta, 'YYYY-MM')
      ORDER BY mes ASC;
    `);

    // Calcular mes anterior para crecimiento MoM
    const [year, month] = targetPeriod.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevPeriod = prevDate.toISOString().slice(0, 7);
    const prevMetrics = await this.getDashboardMetrics(prevPeriod);

    const crecimientoVentasPercent = prevMetrics.totalVentasSoles > 0
      ? ((metrics.totalVentasSoles - prevMetrics.totalVentasSoles) / prevMetrics.totalVentasSoles) * 100
      : 0;

    const crecimientoUnidadesPercent = prevMetrics.totalLaptops > 0
      ? ((metrics.totalLaptops - prevMetrics.totalLaptops) / prevMetrics.totalLaptops) * 100
      : 0;

    // Productos top
    const topProdRes = await db.query(`
      SELECT 
        l.marca,
        l.modelo,
        l.condicion,
        COUNT(v.id) as unidades_vendidas,
        SUM(v.precio_venta_final) as ingreso_total,
        SUM(v.ganancia_base_negocio) as ganancia_base_total
      FROM ventas v
      JOIN laptops l ON v.laptop_id = l.id
      WHERE TO_CHAR(v.fecha_venta, 'YYYY-MM') = $1
        AND v.estado IN ('pagada', 'entregada')
      GROUP BY l.marca, l.modelo, l.condicion
      ORDER BY unidades_vendidas DESC, ingreso_total DESC
      LIMIT 10;
    `, [targetPeriod]);

    // Formatear comparativa histórica con crecimiento MoM
    let prevVentas = 0;
    const comparativaHistorica = historyRes.rows.map((row) => {
      const vtas = parseFloat(row.total_ventas || 0);
      const units = parseInt(row.total_unidades || 0);
      const comisionesEst = units >= 21 ? units * 50 : units * 25;
      const utilidadEst = parseFloat(row.ganancia_base || 0) - comisionesEst;
      const mom = prevVentas > 0 ? ((vtas - prevVentas) / prevVentas) * 100 : null;
      prevVentas = vtas;

      return {
        periodo: row.mes,
        laptops: units,
        ventas: vtas,
        comisiones: comisionesEst,
        utilidadNeta: utilidadEst,
        crecimientoPercent: mom
      };
    });

    // Desglose por vendedor con cálculo de ganancia real para el negocio
    const porVendedor = [];
    for (const v of vendorRankingList) {
      const ticketPromedio = v.laptopsVendidas > 0 ? Math.round(v.totalVendidoSoles / v.laptopsVendidas) : 0;
      
      const vtaGainRes = await db.query(`
        SELECT COALESCE(SUM(ganancia_base_negocio), 0) as total_ganancia_base
        FROM ventas
        WHERE vendedor_id = $1
          AND TO_CHAR(fecha_venta, 'YYYY-MM') = $2
          AND estado IN ('pagada', 'entregada');
      `, [v.vendedorId, targetPeriod]);

      const gananciaBaseVend = parseFloat(vtaGainRes.rows[0].total_ganancia_base || 0);
      const gananciaAportada = Math.round(gananciaBaseVend - v.comisionesAcumuladas);

      porVendedor.push({
        vendedor_id: v.vendedorId,
        vendedor_nombre: v.nombre,
        laptops_vendidas: v.laptopsVendidas,
        total_ventas: v.totalVendidoSoles,
        comisiones: v.comisionesAcumuladas,
        diferencias: v.diferenciasNegociacion,
        ingreso_total_vendedor: v.totalIngresosAdicionales,
        ganancia_para_negocio: gananciaAportada,
        ticket_promedio: ticketPromedio
      });
    }

    return {
      periodo: targetPeriod,
      resumen: {
        laptopsVendidas: metrics.totalLaptops,
        totalVentas: metrics.totalVentasSoles,
        costoTotal: metrics.totalCostoAdquisicion,
        gastosAdquisicionTotal: metrics.totalGastosAdquisicion,
        gananciaBrutaBase: metrics.gananciaBrutaBaseNegocio,
        comisionesTotal: metrics.totalComisionesAcumuladas,
        diferenciasTotal: metrics.totalDiferenciasVendedores,
        gastosOperativos: metrics.otrosGastosOperativos,
        gananciaNeta: metrics.gananciaRestanteNegocio,
        margenNetoPercent: metrics.totalVentasSoles > 0 
          ? (metrics.gananciaRestanteNegocio / metrics.totalVentasSoles) * 100 
          : 0,
        crecimientoVentasPercent,
        crecimientoUnidadesPercent
      },
      porVendedor,
      comparativaHistorica,
      topProductos: topProdRes.rows
    };
  }
}

module.exports = ReportService;
