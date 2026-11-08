/**
 * Formatea un número a moneda peruana Soles (S/)
 * @param {number|string} amount 
 * @returns {string} Ej: S/ 1,250.00
 */
export function formatCurrency(amount) {
  const val = parseFloat(amount || 0);
  return 'S/ ' + val.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formatea una fecha ISO o string a formato legible en español
 * @param {string|Date} dateStr 
 * @returns {string} Ej: 03 Nov 2026
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Formatea porcentaje
 */
export function formatPercent(val) {
  const num = parseFloat(val || 0);
  return `${num.toFixed(1)}%`;
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(val) {
  const num = parseFloat(val || 0);
  return num.toLocaleString('es-PE');
}

/**
 * Formatea fecha y hora completa
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Retorna el nombre en español del mes a partir de YYYY-MM
 */
export function getMonthName(yearMonthStr) {
  if (!yearMonthStr) return '';
  const [year, month] = yearMonthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  const monthName = date.toLocaleDateString('es-PE', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}
