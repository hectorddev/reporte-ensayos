import { ADMIN_PASSWORD } from '../../../lib/datosEstaticos';
import {
  actualizarReporte,
  buscarReporte,
  eliminarReporte,
  leerReportes,
} from '../../../lib/almacenamiento';
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
 * Administración 100% local. El "login" valida contra una contraseña fija del
 * código: no es seguridad real, solo evita ediciones accidentales.
 */

export async function adminLogin(password: string): Promise<void> {
  if (password !== ADMIN_PASSWORD) {
    throw new Error('Contraseña incorrecta');
  }
}

export function fetchAdminReportes(): Promise<ReporteMensualGuardado[]> {
  const reportes = leerReportes().sort(
    (a, b) => b.anio - a.anio || b.mes - a.mes
  );
  return Promise.resolve(reportes);
}

export function fetchAdminReporte(id: string): Promise<ReporteMensualGuardado> {
  const reporte = buscarReporte(id);
  if (!reporte) return Promise.reject(new Error('Reporte no encontrado'));
  return Promise.resolve(reporte);
}

export function actualizarAdminReporte(
  id: string,
  data: ReporteMensualFormData
): Promise<ReporteMensualResponse> {
  const reporte = actualizarReporte(id, formDataAReporte(data));
  return Promise.resolve(
    construirRespuesta(reporte, data, 'Reporte actualizado correctamente')
  );
}

export function eliminarAdminReporte(id: string): Promise<{ mensaje: string }> {
  eliminarReporte(id);
  return Promise.resolve({ mensaje: 'Reporte eliminado' });
}
