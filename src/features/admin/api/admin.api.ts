import {
  actualizarReporte,
  eliminarReporte,
  obtenerReportes,
} from '../../../lib/nube';
import {
  construirRespuesta,
  formDataAReporte,
} from '../../reporte-mensual/api/reporteMensual.api';
import type {
  ReporteMensualFormData,
  ReporteMensualGuardado,
  ReporteMensualResponse,
} from '../../reporte-mensual/types/reporteMensual.types';

/**
 * Administración de reportes. El acceso al panel lo controla la clave de
 * coordinación (ver AdminLogin), que valida el servicio de constancias.
 */

export async function fetchAdminReportes(): Promise<ReporteMensualGuardado[]> {
  const reportes = await obtenerReportes('coordinacion');
  return reportes.sort((a, b) => b.anio - a.anio || b.mes - a.mes);
}

export async function fetchAdminReporte(id: string): Promise<ReporteMensualGuardado> {
  const reportes = await obtenerReportes('coordinacion');
  const reporte = reportes.find((r) => r.id === id);
  if (!reporte) throw new Error('Reporte no encontrado');
  return reporte;
}

export async function actualizarAdminReporte(
  id: string,
  data: ReporteMensualFormData
): Promise<ReporteMensualResponse> {
  const reporte = await actualizarReporte(id, formDataAReporte(data));
  return construirRespuesta(reporte, data, 'Reporte actualizado correctamente');
}

export async function eliminarAdminReporte(id: string): Promise<{ mensaje: string }> {
  await eliminarReporte(id);
  return { mensaje: 'Reporte eliminado' };
}
