import * as XLSX from 'xlsx';

/**
 * Exporta un arreglo de datos JSON a un archivo Excel (.xlsx)
 * @param {Array<Object>} data 
 * @param {string} fileName 
 * @param {string} sheetName 
 */
export function exportToExcel(data, fileName = 'Reporte_Comercial.xlsx', sheetName = 'Datos') {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar a Excel.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-ajustar ancho de columnas
  const maxProps = Object.keys(data[0]);
  const colWidths = maxProps.map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(item => (item[key] ? String(item[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
