import type { Constancia } from '../types/constancia.types';

/**
 * Bandeja de la coordinación: las solicitudes abiertas y su decisión quedan en
 * el navegador de quien las revisa (no hay servidor). Otro dispositivo no las ve.
 */

const CLAVE_HISTORIAL = 'constancias_historial';
const MAX_HISTORIAL = 500;

export function leerHistorial(): Constancia[] {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL) ?? '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function escribir(lista: Constancia[]): void {
  try {
    localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(lista.slice(0, MAX_HISTORIAL)));
  } catch {
    // Sin almacenamiento disponible: la revisión funciona, pero no queda registrada.
  }
}

export function buscarEnHistorial(codigo: string): Constancia | undefined {
  return leerHistorial().find((c) => c.codigo === codigo);
}

/** Inserta o reemplaza por código; lo último revisado queda primero. */
export function guardarEnHistorial(c: Constancia): void {
  escribir([c, ...leerHistorial().filter((x) => x.codigo !== c.codigo)]);
}

export function eliminarDelHistorial(codigo: string): void {
  escribir(leerHistorial().filter((c) => c.codigo !== codigo));
}
