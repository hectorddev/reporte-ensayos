import { MODULOS_PSB, PROGRAMAS, PROGRAMA_PSB, nombreEnCatalogo } from '../../../lib/datosEstaticos';
import type { AgrupacionCatalogo } from '../../../lib/agrupaciones';
import type { Profesor } from '../api/profesores.api';

export const PROFESOR_VACIO: Profesor = { cedula: '', nombre: '', agrupaciones: [], programas: [], modulos: [], horario: [] };

/** ¿Tiene programas de la sede (además o en vez de Simón Bolívar)? */
export const tieneSede = (p: Profesor) => p.programas.some((id) => id !== PROGRAMA_PSB);
export const tienePSB = (p: Profesor) => p.programas.includes(PROGRAMA_PSB);

export const nombresProgramas = (ids: string[]) => ids.map((id) => nombreEnCatalogo(PROGRAMAS, id));
export const nombresEscuelas = (ids: string[]) => ids.map((id) => nombreEnCatalogo(MODULOS_PSB, id));
export const nombresAgrupaciones = (ids: string[], catalogo: AgrupacionCatalogo[]) =>
  ids.map((id) => catalogo.find((a) => a.id === id)?.nombre ?? id);

/** Mensaje para avisarle al profesor cómo entrar. */
export function mensajeAcceso(p: Profesor, catalogo: AgrupacionCatalogo[]): string {
  const que: string[] = [];
  if (p.agrupaciones.length) que.push(`los reportes de ensayo de ${nombresAgrupaciones(p.agrupaciones, catalogo).join(', ')}`);
  if (tienePSB(p) && p.modulos.length) {
    que.push(`los informes del Programa Simón Bolívar de ${nombresEscuelas(p.modulos).join(', ')}`);
  }
  return [
    `Hola ${p.nombre}.`,
    `Ya puedes registrar ${que.join(' y ') || 'tus reportes'} en ${window.location.origin}/profesores`,
    'Entra con tu número de cédula.',
  ].join('\n');
}
