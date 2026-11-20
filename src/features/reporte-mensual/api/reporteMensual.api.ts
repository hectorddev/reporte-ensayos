import { buscarAgrupacion, cargarAgrupaciones } from '../../../lib/agrupaciones';
import { guardarReporte, obtenerReportes } from '../../../lib/nube';
import {
  totalMatricula,
  type Agrupacion,
  type ReporteMensualFormData,
  type ReporteMensualGuardado,
  type ReporteMensualResponse,
} from '../types/reporteMensual.types';

/**
 * Reportes del profesor que tiene la sesión abierta: solo los de sus
 * agrupaciones (ver lib/nube.ts y lib/profesorAuth.ts).
 */

/** Convierte los datos del formulario en un reporte almacenable. */
export function formDataAReporte(
  data: ReporteMensualFormData
): Omit<ReporteMensualGuardado, 'id' | 'createdAt'> {
  const delCatalogo = buscarAgrupacion(data.agrupacionId);
  const agrupacion = delCatalogo
    ? { id: delCatalogo.id, codigo: delCatalogo.codigo, nombre: delCatalogo.nombre }
    : { id: data.agrupacionId, codigo: data.agrupacionId, nombre: data.agrupacionId };

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

/** Agrupaciones activas del catálogo (lo edita la coordinación). */
export async function fetchAgrupaciones(): Promise<Agrupacion[]> {
  return (await cargarAgrupaciones()).filter((a) => a.activa);
}

export interface FiltrosReportes {
  agrupacionId?: string;
  anio?: number;
  mes?: number;
}

export async function fetchReportesMensuales(
  filtros?: FiltrosReportes
): Promise<ReporteMensualGuardado[]> {
  let reportes = await obtenerReportes('profesor');
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
  return reportes;
}

export async function submitReporteMensual(
  data: ReporteMensualFormData
): Promise<ReporteMensualResponse> {
  const reporte = await guardarReporte('profesor', formDataAReporte(data));
  return construirRespuesta(reporte, data, 'Reporte guardado correctamente');
}
