const db = require('../db');

/**
 * Motor de Comisiones Retroactivas
 */
class CommissionService {
  /**
   * Obtiene las reglas activas de la base de datos o usa las reglas congeladas del periodo
   */
  static async getActiveRules(clientOrDb = db) {
    const res = await clientOrDb.query(`
      SELECT id, nombre_escala, rango_min, rango_max, monto_por_unidad, es_retroactivo, orden
      FROM reglas_comision
      WHERE activo = TRUE
      ORDER BY rango_min ASC;
    `);
    return res.rows;
  }

  /**
   * Calcula la comisión para una cantidad dada de laptops según las reglas
   * @param {number} totalUnits - Cantidad total de laptops válidas
   * @param {Array} rules - Reglas de comisión
   */
  static calculateAmount(totalUnits, rules) {
    if (!totalUnits || totalUnits <= 0 || !rules || rules.length === 0) {
      return {
        totalCommission: 0,
        ratePerUnit: 0,
        currentTier: null,
        isRetroactive: false
      };
    }

    // Buscar el nivel correspondiente
    let matchingTier = null;
    for (const rule of rules) {
      const min = parseInt(rule.rango_min, 10);
      const max = parseInt(rule.rango_max, 10);
      if (totalUnits >= min && totalUnits <= max) {
        matchingTier = rule;
        break;
      }
    }

    // Si excede el máximo conocido, usar el nivel más alto
    if (!matchingTier && rules.length > 0) {
      const highest = rules[rules.length - 1];
      if (totalUnits >= parseInt(highest.rango_min, 10)) {
        matchingTier = highest;
      } else {
        matchingTier = rules[0];
      }
    }

    const rate = parseFloat(matchingTier.monto_por_unidad);
    let totalCommission = 0;

    if (matchingTier.es_retroactivo) {
      // REGLA RETROACTIVA: Todas las unidades vendidas reciben la nueva tarifa unitaria
      totalCommission = totalUnits * rate;
    } else {
      // Regla estándar de tarifa fija por unidad
      totalCommission = totalUnits * rate;
    }

    return {
      totalCommission: Math.round(totalCommission * 100) / 100,
      ratePerUnit: rate,
      currentTier: matchingTier,
      isRetroactive: matchingTier.es_retroactivo
    };
  }

  /**
   * Calcula estadísticas completas, progreso hacia metas y alertas para un vendedor en un mes
   */
  static async getVendorMonthlyMetrics(vendorId, monthYear, clientOrDb = db) {
    // Si no se especifica monthYear, usar el mes actual 'YYYY-MM'
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);

    const rules = await this.getActiveRules(clientOrDb);

    // Obtener todas las ventas válidas (excluyendo anulada y devuelta)
    const salesRes = await clientOrDb.query(`
      SELECT v.*, l.marca, l.modelo, l.numero_serie, l.condicion
      FROM ventas v
      JOIN laptops l ON v.laptop_id = l.id
      WHERE v.vendedor_id = $1 
        AND TO_CHAR(v.fecha_venta, 'YYYY-MM') = $2
        AND v.estado IN ('pagada', 'entregada')
      ORDER BY v.fecha_venta ASC, v.id ASC;
    `, [vendorId, targetMonth]);

    const validSales = salesRes.rows;
    const totalUnits = validSales.length;

    // Calcular totales de ventas y diferencias
    let totalSalesAmount = 0;
    let totalNegotiationDiff = 0;
    let totalBusinessBaseProfit = 0;

    for (const sale of validSales) {
      totalSalesAmount += parseFloat(sale.precio_venta_final || 0);
      totalNegotiationDiff += parseFloat(sale.diferencia_vendedor || 0);
      totalBusinessBaseProfit += parseFloat(sale.ganancia_base_negocio || 0);
    }

    // Calcular comisión retroactiva actual
    const commissionCalc = this.calculateAmount(totalUnits, rules);
    const totalCommission = commissionCalc.totalCommission;
    const totalVendorIncome = totalCommission + totalNegotiationDiff;

    // Metas e Hitos: 21, 25, 30, 40, 50
    const milestones = [21, 25, 30, 40, 50];
    const milestoneProgress = milestones.map(target => {
      const reached = totalUnits >= target;
      const percent = Math.min(100, Math.round((totalUnits / target) * 100));
      const remaining = Math.max(0, target - totalUnits);
      return {
        target,
        reached,
        percent,
        remaining
      };
    });

    // Próximo hito y unidades faltantes
    const nextMilestone = milestones.find(m => m > totalUnits) || null;
    const unitsToNext = nextMilestone ? (nextMilestone - totalUnits) : 0;

    // Alerta motivacional de proximidad
    let motivationAlert = null;
    if (totalUnits >= 18 && totalUnits < 21) {
      const diffUnits = 21 - totalUnits;
      const prospectGain = 21 * 50; // S/ 1,050
      const currentGain = totalCommission; // S/ 450 - S/ 500
      const jump = prospectGain - currentGain;
      motivationAlert = {
        type: 'super_reward',
        title: '¡A punto de desbloquear la Comisión Retroactiva!',
        message: `Te faltan solo ${diffUnits} venta${diffUnits > 1 ? 's' : ''} para alcanzar las 21 laptops. ¡Tus 21 unidades pasarán a S/ 50 c/u (S/ 1,050 acumulados, un salto de +S/ ${jump})!`,
        unitsRemaining: diffUnits,
        currentRate: commissionCalc.ratePerUnit,
        nextRate: 50
      };
    } else if (nextMilestone && unitsToNext <= 3) {
      motivationAlert = {
        type: 'milestone_near',
        title: `¡Cerca del hito de ${nextMilestone} ventas!`,
        message: `Estás a solo ${unitsToNext} venta${unitsToNext > 1 ? 's' : ''} de completar el hito de ${nextMilestone} laptops vendidas en el mes.`,
        unitsRemaining: unitsToNext
      };
    }

    return {
      vendorId,
      monthYear: targetMonth,
      totalUnits,
      totalSalesAmount: Math.round(totalSalesAmount * 100) / 100,
      totalNegotiationDiff: Math.round(totalNegotiationDiff * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      totalVendorIncome: Math.round(totalVendorIncome * 100) / 100,
      totalBusinessBaseProfit: Math.round(totalBusinessBaseProfit * 100) / 100,
      currentRatePerUnit: commissionCalc.ratePerUnit,
      currentTierName: commissionCalc.currentTier ? commissionCalc.currentTier.nombre_escala : 'Sin ventas',
      isRetroactiveActive: commissionCalc.isRetroactive,
      nextMilestone,
      unitsToNext,
      milestoneProgress,
      motivationAlert,
      salesCount: validSales.length
    };
  }

  /**
   * Recalcula y actualiza la comisión registrada en cada venta del mes para mantener coherencia retroactiva
   */
  static async syncMonthlyVendorCommissions(vendorId, monthYear, clientOrDb = db) {
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);
    const metrics = await this.getVendorMonthlyMetrics(vendorId, targetMonth, clientOrDb);

    const unitCommission = metrics.totalUnits > 0 ? (metrics.totalCommission / metrics.totalUnits) : 0;

    // Actualizar cada venta válida del mes con la tasa unitaria retroactiva aplicada
    await clientOrDb.query(`
      UPDATE ventas
      SET comision_volumen = $1,
          ganancia_neta_negocio = ganancia_base_negocio - $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE vendedor_id = $2 
        AND TO_CHAR(fecha_venta, 'YYYY-MM') = $3
        AND estado IN ('pagada', 'entregada');
    `, [unitCommission, vendorId, targetMonth]);

    return metrics;
  }
}

module.exports = CommissionService;
