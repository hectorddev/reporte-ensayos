import { URL_NUBE, nubeActiva } from './configNube';
import {
  actualizarReporte as localActualizar,
  borrarTodo as localBorrarTodo,
  eliminarReporte as localEliminar,
  escribirReportes,
  guardarReporte as localGuardar,
  leerReportes,
} from './almacenamiento';
import type { ReporteMensualGuardado } from '../features/reporte-mensual/types/reporteMensual.types';

/**
 * Puerta de enlace de datos. Google Sheets (vía Apps Script) es la fuente de
 * verdad; localStorage actúa como caché y respaldo offline. Las escrituras que
 * fallan por falta de red se encolan y se reintentan en la próxima carga.
 */

type Accion = 'listar' | 'guardar' | 'eliminar' | 'limpiar';

interface Pendiente {
  accion: Exclude<Accion, 'listar'>;
  datos?: unknown;
}

const CLAVE_PENDIENTES = 'nube_pendientes';

function leerPendientes(): Pendiente[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) ?? '[]');
  } catch {
    return [];
  }
}

function escribirPendientes(p: Pendiente[]): void {
  localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(p));
}

function encolar(accion: Pendiente['accion'], datos?: unknown): void {
  escribirPendientes([...leerPendientes(), { accion, datos }]);
}

/** Llama al Web App. POST text/plain evita el preflight CORS de Apps Script. */
async function llamar<T = unknown>(accion: Accion, datos?: unknown): Promise<T> {
  const res = await fetch(URL_NUBE, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion, datos }),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Nube respondió ${res.status}`);
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error ?? 'Error en la nube');
  return json.resultado as T;
}

/** Reintenta las operaciones encoladas mientras no falle ninguna. */
async function vaciarPendientes(): Promise<void> {
  const pendientes = leerPendientes();
  while (pendientes.length > 0) {
    const siguiente = pendientes[0];
    await llamar(siguiente.accion, siguiente.datos);
    pendientes.shift();
    escribirPendientes(pendientes);
  }
}

/** Indica si la última operación de lectura pudo hablar con la nube. */
let ultimaLecturaEnLinea = true;
export function huboErrorDeSincronizacion(): boolean {
  return nubeActiva() && !ultimaLecturaEnLinea;
}

/**
 * Devuelve todos los reportes. Si la nube está activa: vacía pendientes, baja
 * la verdad desde el Sheet y refresca la caché local. Si falla la red, cae a
 * la caché local para seguir funcionando offline.
 */
export async function obtenerReportes(): Promise<ReporteMensualGuardado[]> {
  if (!nubeActiva()) return leerReportes();

  try {
    await vaciarPendientes();
    const remotos = await llamar<ReporteMensualGuardado[]>('listar');
    escribirReportes(remotos);
    ultimaLecturaEnLinea = true;
    return remotos;
  } catch {
    ultimaLecturaEnLinea = false;
    return leerReportes();
  }
}

async function empujar(accion: Pendiente['accion'], datos?: unknown): Promise<void> {
  if (!nubeActiva()) return;
  try {
    await llamar(accion, datos);
  } catch {
    encolar(accion, datos);
  }
}

/** Crea/actualiza un reporte por periodo (agrupación+año+mes). */
export async function guardarReporte(
  parcial: Omit<ReporteMensualGuardado, 'id' | 'createdAt'>
): Promise<ReporteMensualGuardado> {
  const guardado = localGuardar(parcial); // caché local inmediata
  await empujar('guardar', guardado);
  return guardado;
}

/** Actualiza un reporte existente por id (panel admin). */
export async function actualizarReporte(
  id: string,
  parcial: Omit<ReporteMensualGuardado, 'id' | 'createdAt'>
): Promise<ReporteMensualGuardado> {
  const actualizado = localActualizar(id, parcial);
  await empujar('guardar', actualizado);
  return actualizado;
}

export async function eliminarReporte(id: string): Promise<void> {
  localEliminar(id);
  await empujar('eliminar', { id });
}

export async function limpiarTodo(): Promise<void> {
  localBorrarTodo();
  await empujar('limpiar');
}
