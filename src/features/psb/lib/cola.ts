import { URL_NUBE } from '../../../lib/configNube';
import type { ArchivoDrive, DatosDelDia, FotoLocal, InformePSB } from '../tipos';

/**
 * Clases guardadas en el teléfono (IndexedDB) hasta que se envían al servicio.
 * Así una clase reportada sin internet no se pierde: la envía la página apenas
 * hay conexión o, en Android, el service worker (sw-psb.ts) aunque la app esté
 * cerrada. Este módulo no usa window ni localStorage para servir en ambos.
 */

export interface ClasePendiente {
  /** cédula|escuela|semana|fecha: guardar de nuevo el mismo día la reemplaza. */
  clave: string;
  cedula: string;
  modulo: string;
  escuela: string;
  semana: string;
  semanaTexto: string;
  carpetaSemana: string;
  dia: DatosDelDia;
  /** Foto ya en Drive que se conserva (al corregir una clase enviada). */
  fotosGuardadas: ArchivoDrive[];
  /** Foto nueva tomada en el teléfono, todavía sin subir. */
  fotoNueva: FotoLocal | null;
  creadaEn: string;
  /** El servicio la rechazó (no se reintenta sola). */
  error?: string;
  /** Mientras la página o el service worker la están enviando. */
  enviandoHasta?: number;
}

export const claveDeClase = (cedula: string, modulo: string, semana: string, fecha: string) =>
  `${cedula}|${modulo}|${semana}|${fecha}`;

const BD = 'nucleo-palmira';
const ALMACEN = 'clases-psb';
const RESERVA_MS = 2 * 60 * 1000;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BD, 1);
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains(ALMACEN)) pedido.result.createObjectStore(ALMACEN, { keyPath: 'clave' });
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

/** Ejecuta `fn` en una transacción y espera a que termine. */
async function enTransaccion<T>(modo: IDBTransactionMode, fn: (almacen: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const bd = await abrir();
  try {
    const tx = bd.transaction(ALMACEN, modo);
    const resultado = await fn(tx.objectStore(ALMACEN));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return resultado;
  } finally {
    bd.close();
  }
}

function pedir<T>(pedido: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

export function guardarPendiente(p: ClasePendiente): Promise<void> {
  return enTransaccion('readwrite', async (almacen) => {
    await pedir(almacen.put({ ...p, error: undefined, enviandoHasta: undefined }));
  });
}

export async function listarPendientes(cedula?: string): Promise<ClasePendiente[]> {
  const todas = await enTransaccion('readonly', (almacen) => pedir(almacen.getAll() as IDBRequest<ClasePendiente[]>));
  return todas.filter((p) => !cedula || p.cedula === cedula).sort((a, b) => a.creadaEn.localeCompare(b.creadaEn));
}

export function quitarPendiente(clave: string): Promise<void> {
  return enTransaccion('readwrite', async (almacen) => {
    await pedir(almacen.delete(clave));
  });
}

/** La toma para enviarla, si nadie más la está enviando (la página o el service worker). */
function reservar(clave: string): Promise<ClasePendiente | null> {
  return enTransaccion('readwrite', async (almacen) => {
    const p = (await pedir(almacen.get(clave))) as ClasePendiente | undefined;
    if (!p || p.error || (p.enviandoHasta ?? 0) > Date.now()) return null;
    await pedir(almacen.put({ ...p, enviandoHasta: Date.now() + RESERVA_MS }));
    return p;
  });
}

function liberar(clave: string, error?: string): Promise<void> {
  return enTransaccion('readwrite', async (almacen) => {
    const p = (await pedir(almacen.get(clave))) as ClasePendiente | undefined;
    if (p) await pedir(almacen.put({ ...p, enviandoHasta: undefined, error }));
  });
}

const MENSAJES: Record<string, string> = {
  PROFESOR_NO_REGISTRADO: 'Tu cédula ya no está registrada. Habla con la coordinación.',
  SIN_PERMISO: 'Esa escuela ya no está asignada a tu cuenta. Habla con la coordinación.',
};

/** El servicio respondió pero no aceptó la clase (no sirve reintentar sola). */
export class ClaseRechazada extends Error {
  constructor(codigo: string) {
    super(MENSAJES[codigo] ?? codigo);
  }
}

async function llamar<T>(accion: string, datos: unknown, cedula: string): Promise<T> {
  // Sin red, fetch lanza TypeError: la clase queda para el próximo intento.
  const res = await fetch(URL_NUBE, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion, datos, cedula }),
    redirect: 'follow',
  });
  if (!res.ok) throw new TypeError(`El servicio respondió ${res.status}`);
  const json = await res.json();
  if (!json?.ok) throw new ClaseRechazada(String(json?.error ?? 'Error en el servicio'));
  return json.resultado as T;
}

async function subirYGuardar(p: ClasePendiente): Promise<InformePSB> {
  const fotos = [...p.fotosGuardadas];
  let carpeta: { id: string; url: string } | undefined;
  if (p.fotoNueva) {
    const subida = await llamar<ArchivoDrive & { carpeta: { id: string; url: string } }>(
      'subirArchivoPSB',
      {
        modulo: p.modulo,
        escuela: p.escuela,
        carpetaSemana: p.carpetaSemana,
        nombre: `${p.dia.fecha} foto.jpg`,
        mime: 'image/jpeg',
        base64: p.fotoNueva.dataUrl.slice(p.fotoNueva.dataUrl.indexOf(',') + 1),
      },
      p.cedula
    );
    fotos.push({ id: subida.id, url: subida.url, nombre: subida.nombre });
    carpeta = subida.carpeta;
  }
  return llamar<InformePSB>(
    'guardarDiaPSB',
    {
      modulo: p.modulo,
      escuela: p.escuela,
      semana: p.semana,
      semanaTexto: p.semanaTexto,
      carpeta,
      dia: { ...p.dia, fotos },
    },
    p.cedula
  );
}

/**
 * Envía una clase pendiente. Devuelve la semana como quedó, o null si otro la
 * está enviando. Sin red lanza TypeError (queda pendiente); si el servicio la
 * rechaza lanza ClaseRechazada (queda marcada con el error).
 */
export async function enviarPendiente(clave: string): Promise<InformePSB | null> {
  const p = await reservar(clave);
  if (!p) return null;
  try {
    const semana = await subirYGuardar(p);
    await quitarPendiente(clave);
    return semana;
  } catch (err) {
    await liberar(clave, err instanceof ClaseRechazada ? err.message : undefined);
    throw err;
  }
}

/**
 * Envía todas las pendientes, en orden. Se detiene al primer error de red (lo
 * lanza, para que el service worker pida reintentar más tarde).
 */
export async function enviarTodas(avisar?: (semana: InformePSB, clave: string) => void): Promise<number> {
  let enviadas = 0;
  for (const p of await listarPendientes()) {
    if (p.error) continue;
    try {
      const semana = await enviarPendiente(p.clave);
      if (semana) {
        enviadas += 1;
        avisar?.(semana, p.clave);
      }
    } catch (err) {
      if (!(err instanceof ClaseRechazada)) throw err;
    }
  }
  return enviadas;
}
