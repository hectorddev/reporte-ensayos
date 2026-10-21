import { URL_CONSTANCIAS } from '../config';
import type { Constancia, DatosSolicitud, Plantilla } from '../types/constancia.types';

/**
 * Cliente del Web App de constancias (apps-script/constancias). Solicitudes y
 * plantillas se guardan ahí; los enlaces solo llevan el código.
 */

/** El servidor rechazó la clave de coordinación. */
export class ClaveInvalidaError extends Error {
  constructor() {
    super('Clave de coordinación incorrecta.');
  }
}

export function servicioConfigurado(): boolean {
  return URL_CONSTANCIAS.trim().length > 0;
}

/** POST text/plain evita el preflight CORS de Apps Script. */
async function llamar<T>(accion: string, datos?: unknown, clave?: string): Promise<T> {
  if (!servicioConfigurado()) {
    throw new Error('El servicio de constancias aún no está configurado (falta URL_CONSTANCIAS).');
  }
  let res: Response;
  try {
    res = await fetch(URL_CONSTANCIAS, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion, datos, clave }),
      redirect: 'follow',
    });
  } catch {
    throw new Error('No se pudo conectar. Revisa tu internet e intenta de nuevo.');
  }
  if (!res.ok) throw new Error(`El servicio respondió ${res.status}. Intenta de nuevo.`);
  const json = await res.json();
  if (!json?.ok) {
    if (json?.error === 'CLAVE_INVALIDA') throw new ClaveInvalidaError();
    throw new Error(json?.error ?? 'Error en el servicio de constancias.');
  }
  return json.resultado as T;
}

/* ---------- Públicas ---------- */

export function crearSolicitud(datos: DatosSolicitud & { plantilla?: string }): Promise<{ codigo: string }> {
  return llamar('crearSolicitud', datos);
}

export function listarPlantillasActivas(): Promise<Plantilla[]> {
  return llamar('listarPlantillasActivas');
}

export function leerPlantilla(codigo: string): Promise<Plantilla> {
  return llamar('leerPlantilla', { codigo: codigo.trim().toUpperCase() });
}

/* ---------- Coordinación ---------- */

export function verificarClave(clave: string): Promise<true> {
  return llamar('verificarClave', undefined, clave);
}

export async function listarSolicitudes(clave: string): Promise<Constancia[]> {
  const lista = await llamar<Constancia[]>('listarSolicitudes', undefined, clave);
  return lista.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

/** Sin código crea una nueva (el servidor lo asigna). */
export function guardarSolicitud(c: Omit<Constancia, 'codigo'> & { codigo?: string }, clave: string): Promise<Constancia> {
  return llamar('guardarSolicitud', c, clave);
}

export function eliminarSolicitud(codigo: string, clave: string): Promise<void> {
  return llamar('eliminarSolicitud', { codigo }, clave);
}

export async function listarPlantillas(clave: string): Promise<Plantilla[]> {
  const lista = await llamar<Plantilla[]>('listarPlantillas', undefined, clave);
  return lista.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

/** Sin código crea una nueva (el servidor lo asigna). */
export function guardarPlantilla(p: Omit<Plantilla, 'codigo' | 'creadoEn'> & { codigo?: string; creadoEn?: string }, clave: string): Promise<Plantilla> {
  return llamar('guardarPlantilla', p, clave);
}

export function eliminarPlantilla(codigo: string, clave: string): Promise<void> {
  return llamar('eliminarPlantilla', { codigo }, clave);
}
