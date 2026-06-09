import type { ReporteMensualGuardado } from '../features/reporte-mensual/types/reporteMensual.types';

const CLAVE = 'reportes_mensuales';

/** Lee todos los reportes guardados. Tolerante a datos corruptos. */
export function leerReportes(): ReporteMensualGuardado[] {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return [];
    const datos = JSON.parse(raw);
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

/** Sobrescribe la lista completa de reportes. */
export function escribirReportes(reportes: ReporteMensualGuardado[]): void {
  localStorage.setItem(CLAVE, JSON.stringify(reportes));
}

/** Borra todos los reportes del almacenamiento local. */
export function borrarTodo(): void {
  localStorage.removeItem(CLAVE);
}

function nuevoId(): string {
  return crypto.randomUUID();
}

/** Guarda un reporte. Si ya existe uno para esa agrupación/año/mes, lo reemplaza. */
export function guardarReporte(
  reporte: Omit<ReporteMensualGuardado, 'id' | 'createdAt'>
): ReporteMensualGuardado {
  const reportes = leerReportes();
  const existenteIdx = reportes.findIndex(
    (r) =>
      r.agrupacionId === reporte.agrupacionId &&
      r.anio === reporte.anio &&
      r.mes === reporte.mes
  );

  if (existenteIdx >= 0) {
    const previo = reportes[existenteIdx];
    const actualizado: ReporteMensualGuardado = {
      ...reporte,
      id: previo.id,
      createdAt: previo.createdAt,
    };
    reportes[existenteIdx] = actualizado;
    escribirReportes(reportes);
    return actualizado;
  }

  const creado: ReporteMensualGuardado = {
    ...reporte,
    id: nuevoId(),
    createdAt: new Date().toISOString(),
  };
  reportes.push(creado);
  escribirReportes(reportes);
  return creado;
}

/** Actualiza un reporte por id. Lanza si no existe. */
export function actualizarReporte(
  id: string,
  reporte: Omit<ReporteMensualGuardado, 'id' | 'createdAt'>
): ReporteMensualGuardado {
  const reportes = leerReportes();
  const idx = reportes.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error('Reporte no encontrado');

  const actualizado: ReporteMensualGuardado = {
    ...reporte,
    id,
    createdAt: reportes[idx].createdAt,
  };
  reportes[idx] = actualizado;
  escribirReportes(reportes);
  return actualizado;
}

/** Elimina un reporte por id. */
export function eliminarReporte(id: string): void {
  const reportes = leerReportes().filter((r) => r.id !== id);
  escribirReportes(reportes);
}

export function buscarReporte(id: string): ReporteMensualGuardado | undefined {
  return leerReportes().find((r) => r.id === id);
}
