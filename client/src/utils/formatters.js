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
 * Retorna la fecha local actual en formato YYYY-MM-DD según la zona horaria del dispositivo
 * evitando que UTC altere el día (ej: después de las 7:00 PM en Perú UTC-5)
 * @param {Date} d 
 * @returns {string} Ej: "2026-11-13"
 */
export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha ISO o string a formato legible en español sin desfase de zona horaria
 * @param {string|Date} dateStr 
 * @returns {string} Ej: 13 nov. 2026
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  // Si viene en formato YYYY-MM-DD o ISO que inicia con YYYY-MM-DD
  if (typeof dateStr === 'string') {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [_, year, month, day] = match;
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  }
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
