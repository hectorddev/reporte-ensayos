import { URL_NUBE, nubeActiva } from './configNube';
import { getClaveCoordinacion } from './adminAuth';
import { actualizarPerfilProfesor, getSesionProfesor, type SesionProfesor } from './profesorAuth';
import {
  actualizarReporte as localActualizar,
  borrarTodo as localBorrarTodo,
  eliminarReporte as localEliminar,
  escribirReportes,
  guardarReporte as localGuardar,
  leerReportes,
  reemplazarReporte,
} from './almacenamiento';
import type { ReporteMensualGuardado } from '../features/reporte-mensual/types/reporteMensual.types';

/**
 * Puerta de enlace de datos de los reportes. Google Sheets (vía Apps Script) es
 * la fuente de verdad; localStorage actúa como caché y respaldo sin conexión.
 * Las escrituras que fallan por falta de red se encolan y se reintentan en la
 * próxima carga.
 *
 * Cada llamada va como profesor (con su cédula: solo sus agrupaciones) o como
 * coordinación (con la clave: todo).
 */

export type Rol = 'profesor' | 'coordinacion';
type Operacion = 'listar' | 'guardar' | 'eliminar' | 'limpiar';

/** Nombre de la acción del servicio según quién la pide. */
const ACCIONES: Record<Rol, Partial<Record<Operacion, string>>> = {
  profesor: { listar: 'listarMios', guardar: 'guardarMio' },
  coordinacion: { listar: 'listar', guardar: 'guardar', eliminar: 'eliminar', limpiar: 'limpiar' },
};

const MENSAJES: Record<string, string> = {
  CLAVE_INVALIDA: 'La clave de coordinación no es válida. Cierra sesión y vuelve a entrar.',
  PROFESOR_NO_REGISTRADO: 'Tu cédula no está registrada. Pide a la coordinación que te registre.',
  SIN_PERMISO: 'Esa agrupación no está asignada a tu cuenta. Habla con la coordinación.',
};

/** El servicio respondió pero rechazó la operación (clave, cédula, permiso o datos). */
export class ErrorServicio extends Error {
  readonly codigo: string;
  constructor(codigo: string) {
    super(MENSAJES[codigo] ?? codigo);
    this.codigo = codigo;
  }
}

type Credencial = { clave?: string; cedula?: string };

function credencialDe(rol: Rol): Credencial {
  return rol === 'coordinacion'
    ? { clave: getClaveCoordinacion() ?? '' }
    : { cedula: getSesionProfesor()?.cedula ?? '' };
}

/**
 * Llama al Web App de reportes. POST text/plain evita el preflight CORS de
 * Apps Script. Sin red lanza TypeError; si el servicio rechaza, ErrorServicio.
 */
export async function llamarServicio<T = unknown>(accion: string, datos: unknown, credencial: Credencial): Promise<T> {
  const res = await fetch(URL_NUBE, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion, datos, ...credencial }),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`El servicio de reportes respondió ${res.status}`);
  const json = await res.json();
  if (!json?.ok) throw new ErrorServicio(String(json?.error ?? 'Error en el servicio de reportes'));
  return json.resultado as T;
}

/* ---------- Cola sin conexión ---------- */

interface Pendiente {
  operacion: Exclude<Operacion, 'listar'>;
  datos?: unknown;
  rol?: Rol;
  /** Cédula con la que se guardó (si fue un profesor), por si luego cierra sesión. */
  cedula?: string;
  /** Formato anterior (antes de los roles). */
  accion?: Exclude<Operacion, 'listar'>;
}

const CLAVE_PENDIENTES = 'nube_pendientes';

function leerPendientes(): Pendiente[] {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) ?? '[]');
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function escribirPendientes(p: Pendiente[]): void {
  try {
    localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(p));
  } catch {
    // Sin almacenamiento no hay cola.
  }
}

function encolar(rol: Rol, operacion: Pendiente['operacion'], datos: unknown): void {
  const cedula = rol === 'profesor' ? getSesionProfesor()?.cedula : undefined;
  escribirPendientes([...leerPendientes(), { rol, operacion, datos, cedula }]);
}

/**
 * Reintenta las operaciones encoladas en orden. Si falta la red se detiene (se
 * reintentará después); si el servicio rechaza una, se descarta para que no
 * bloquee a las demás.
 */
async function vaciarPendientes(rolActual: Rol): Promise<void> {
  const pendientes = leerPendientes();
  while (pendientes.length > 0) {
    const p = pendientes[0];
    const rol = p.rol ?? rolActual;
    const operacion = p.operacion ?? p.accion;
    const accion = operacion && ACCIONES[rol][operacion];
    if (accion) {
      try {
        const credencial = rol === 'profesor' && p.cedula ? { cedula: p.cedula } : credencialDe(rol);
        await llamarServicio(accion, p.datos, credencial);
      } catch (err) {
        if (!(err instanceof ErrorServicio)) throw err;
        console.warn('Operación pendiente rechazada por el servicio:', operacion, err.message);
      }
    }
    pendientes.shift();
    escribirPendientes(pendientes);
  }
}

/** Indica si la última operación de lectura pudo hablar con la nube. */
let ultimaLecturaEnLinea = true;
export function huboErrorDeSincronizacion(): boolean {
  return nubeActiva() && !ultimaLecturaEnLinea;
}

/** Sin conexión, el profesor solo ve en la caché los de sus agrupaciones. */
function cacheVisible(rol: Rol): ReporteMensualGuardado[] {
  const reportes = leerReportes();
  if (rol === 'coordinacion') return reportes;
  const mias = getSesionProfesor()?.agrupaciones ?? [];
  return reportes.filter((r) => mias.includes(r.agrupacionId));
}

/**
 * Reportes visibles para el rol. Con la nube activa: vacía pendientes, baja la
 * verdad desde el Sheet y refresca la caché local. Sin red cae a la caché; si el
 * servicio rechaza (clave o cédula), avisa con ErrorServicio.
 */
export async function obtenerReportes(rol: Rol): Promise<ReporteMensualGuardado[]> {
  if (!nubeActiva()) return cacheVisible(rol);

  try {
    await vaciarPendientes(rol);
    let remotos: ReporteMensualGuardado[];
    if (rol === 'profesor') {
      const r = await llamarServicio<{
        profesor: Partial<Omit<SesionProfesor, 'cedula'>>;
        reportes: ReporteMensualGuardado[];
      }>('listarMios', {}, credencialDe(rol));
      actualizarPerfilProfesor(r.profesor);
      remotos = r.reportes;
    } else {
      remotos = await llamarServicio<ReporteMensualGuardado[]>('listar', {}, credencialDe(rol));
    }
    escribirReportes(remotos);
    ultimaLecturaEnLinea = true;
    return remotos;
  } catch (err) {
    if (err instanceof ErrorServicio) throw err;
    ultimaLecturaEnLinea = false;
    return cacheVisible(rol);
  }
}

/** Envía una escritura; sin red la encola. Devuelve lo que respondió el servicio. */
async function empujar<T>(rol: Rol, operacion: Pendiente['operacion'], datos?: unknown): Promise<T | null> {
  const accion = ACCIONES[rol][operacion];
  if (!nubeActiva() || !accion) return null;
  try {
    return await llamarServicio<T>(accion, datos, credencialDe(rol));
  } catch (err) {
    if (err instanceof ErrorServicio) throw err;
    encolar(rol, operacion, datos);
    return null;
  }
}

/** Crea/actualiza un reporte por periodo (agrupación+año+mes). */
export async function guardarReporte(
  rol: Rol,
  parcial: Omit<ReporteMensualGuardado, 'id' | 'createdAt'>
): Promise<ReporteMensualGuardado> {
  const guardado = localGuardar(parcial); // caché local inmediata
  const remoto = await empujar<ReporteMensualGuardado>(rol, 'guardar', guardado);
  // Si otro profesor ya había creado ese mes, el servicio conserva su id.
  if (remoto) {
    reemplazarReporte(guardado.id, remoto);
    return remoto;
  }
  return guardado;
}

/** Actualiza un reporte existente por id (panel de coordinación). */
export async function actualizarReporte(
  id: string,
  parcial: Omit<ReporteMensualGuardado, 'id' | 'createdAt'>
): Promise<ReporteMensualGuardado> {
  const actualizado = localActualizar(id, parcial);
  const remoto = await empujar<ReporteMensualGuardado>('coordinacion', 'guardar', actualizado);
  if (remoto) {
    reemplazarReporte(id, remoto);
    return remoto;
  }
  return actualizado;
}

export async function eliminarReporte(id: string): Promise<void> {
  localEliminar(id);
  await empujar('coordinacion', 'eliminar', { id });
}

export async function limpiarTodo(): Promise<void> {
  localBorrarTodo();
  await empujar('coordinacion', 'limpiar');
}
