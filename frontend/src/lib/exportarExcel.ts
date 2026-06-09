import { leerReportes } from './almacenamiento';
import {
  MESES,
  formatFechaIso,
  totalDesdeReporte,
  type ReporteMensualGuardado,
} from '../features/reporte-mensual/types/reporteMensual.types';

/** Nombre de hoja válido para Excel: máx 31 chars, sin caracteres prohibidos. */
function nombreHojaValido(nombre: string): string {
  return nombre.replace(/[\\/?*[\]:]/g, '_').slice(0, 31);
}

function filaDeReporte(reporte: ReporteMensualGuardado) {
  return {
    Periodo: `${MESES[reporte.mes - 1]} ${reporte.anio}`,
    Año: reporte.anio,
    Mes: MESES[reporte.mes - 1],
    'N° Ensayos': reporte.ensayos.length,
    'Fechas de ensayo': reporte.ensayos.map((e) => formatFechaIso(e.fecha)).join(', '),
    Niños: reporte.totalNinos,
    Niñas: reporte.totalNinas,
    'Adolescentes F': reporte.totalAdolescentesFemeninas,
    'Adolescentes M': reporte.totalAdolescentesMasculinos,
    'Adultos F': reporte.totalAdultosFemeninos,
    'Adultos M': reporte.totalAdultosMasculinos,
    'Total matrícula': totalDesdeReporte(reporte),
    Repertorio: reporte.repertorioTexto?.split('\n').filter(Boolean).join(' | ') ?? '',
    Observaciones: reporte.observaciones ?? '',
  };
}

/**
 * Exporta todos los reportes a un .xlsx con una hoja por agrupación.
 * Devuelve false si no hay nada que exportar.
 */
export async function exportarReportesAExcel(): Promise<boolean> {
  const reportes = leerReportes();
  if (reportes.length === 0) return false;

  // Carga diferida: xlsx es pesado, solo se descarga al exportar.
  const XLSX = await import('xlsx');

  // Agrupar por agrupación, conservando el nombre legible.
  const porAgrupacion = new Map<string, ReporteMensualGuardado[]>();
  for (const reporte of reportes) {
    const clave = reporte.agrupacion?.nombre ?? reporte.agrupacionId;
    const lista = porAgrupacion.get(clave) ?? [];
    lista.push(reporte);
    porAgrupacion.set(clave, lista);
  }

  const libro = XLSX.utils.book_new();
  const usados = new Set<string>();

  for (const [nombre, lista] of porAgrupacion) {
    lista.sort((a, b) => b.anio - a.anio || b.mes - a.mes);
    const hoja = XLSX.utils.json_to_sheet(lista.map(filaDeReporte));

    // Garantiza nombres de hoja únicos y válidos.
    let nombreHoja = nombreHojaValido(nombre);
    let sufijo = 1;
    while (usados.has(nombreHoja.toLowerCase())) {
      nombreHoja = nombreHojaValido(`${nombre} ${++sufijo}`);
    }
    usados.add(nombreHoja.toLowerCase());

    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `reportes_ensayos_${hoy}.xlsx`);
  return true;
}
