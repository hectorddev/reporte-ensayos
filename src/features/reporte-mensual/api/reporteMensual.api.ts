import { AGRUPACIONES, buscarAgrupacion } from '../../../lib/datosEstaticos';
import { guardarReporte, leerReportes } from '../../../lib/almacenamiento';
import {
  totalMatricula,
  type Agrupacion,
  type ReporteMensualFormData,
  type ReporteMensualGuardado,
  type ReporteMensualResponse,
} from '../types/reporteMensual.types';

/**
 * Capa de datos 100% local (localStorage). Mantiene las mismas firmas que la
 * versión con backend para que componentes y hooks no cambien.
 */

/** Convierte los datos del formulario en un reporte almacenable. */
export function formDataAReporte(
  data: ReporteMensualFormData
): Omit<ReporteMensualGuardado, 'id' | 'createdAt'> {
  const agrupacion =
    buscarAgrupacion(data.agrupacionId) ?? {
      id: data.agrupacionId,
      codigo: data.agrupacionId,
      nombre: data.agrupacionId,
    };

  const repertorioTexto = data.temasRepertorio.filter(Boolean).join('\n') || null;

  return {
    agrupacionId: data.agrupacionId,
    anio: data.anio,
    mes: data.mes,
    totalNinos: data.matricula.ninos,
    totalNinas: data.matricula.ninas,
    totalAdolescentesFemeninas: data.matricula.adolescentesFemeninas,
    totalAdolescentesMasculinos: data.matricula.adolescentesMasculinos,
    totalAdultosFemeninos: data.matricula.adultosFemeninos,
    totalAdultosMasculinos: data.matricula.adultosMasculinos,
    repertorioTexto,
    observaciones: data.observaciones?.trim() || null,
    cerrado: true,
    agrupacion,
    ensayos: data.fechasEnsayos.map((fecha) => ({
      id: `${data.agrupacionId}-${fecha}`,
      fecha: `${fecha}T12:00:00.000Z`,
    })),
  };
}

export function construirRespuesta(
  reporte: ReporteMensualGuardado,
  data: ReporteMensualFormData,
  mensaje: string
): ReporteMensualResponse {
  return {
    reporte,
    matriculaGuardada: {
      ...data.matricula,
      totalActivos: totalMatricula(data.matricula),
    },
    mensaje,
  };
}

export function fetchAgrupaciones(): Promise<Agrupacion[]> {
  return Promise.resolve(AGRUPACIONES);
}

export interface FiltrosReportes {
  agrupacionId?: string;
  anio?: number;
  mes?: number;
}

export function fetchReportesMensuales(
  filtros?: FiltrosReportes
): Promise<ReporteMensualGuardado[]> {
  let reportes = leerReportes();
  if (filtros?.agrupacionId) {
    reportes = reportes.filter((r) => r.agrupacionId === filtros.agrupacionId);
  }
  if (filtros?.anio) {
    reportes = reportes.filter((r) => r.anio === filtros.anio);
  }
  if (filtros?.mes) {
    reportes = reportes.filter((r) => r.mes === filtros.mes);
  }
  // Más recientes primero (por periodo).
  reportes.sort((a, b) => b.anio - a.anio || b.mes - a.mes);
  return Promise.resolve(reportes);
}

export function submitReporteMensual(
  data: ReporteMensualFormData
): Promise<ReporteMensualResponse> {
  const reporte = guardarReporte(formDataAReporte(data));
  return Promise.resolve(
    construirRespuesta(reporte, data, 'Reporte guardado correctamente')
  );
}
