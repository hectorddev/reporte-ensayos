import { escribirLista, guardarPrimero, leerLista } from './almacenLocal';
import type { Constancia } from '../types/constancia.types';

/**
 * Bandeja de la coordinación: las solicitudes abiertas y su decisión quedan en
 * el navegador de quien las revisa (no hay servidor). Otro dispositivo no las ve.
 */

const CLAVE_HISTORIAL = 'constancias_historial';
const MAX_HISTORIAL = 500;

export function leerHistorial(): Constancia[] {
  return leerLista<Constancia>(CLAVE_HISTORIAL);
}

export function buscarEnHistorial(codigo: string): Constancia | undefined {
  return leerHistorial().find((c) => c.codigo === codigo);
}

export function guardarEnHistorial(c: Constancia): void {
  guardarPrimero(CLAVE_HISTORIAL, c, (x) => x.codigo === c.codigo, MAX_HISTORIAL);
}

export function eliminarDelHistorial(codigo: string): void {
  escribirLista(CLAVE_HISTORIAL, leerHistorial().filter((c) => c.codigo !== codigo), MAX_HISTORIAL);
}
