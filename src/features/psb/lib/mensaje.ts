import { INFORME_PSB } from '../config';
import type { DatosDelDia } from '../tipos';

/** 2026-11-13 → 13/11/2026 */
export function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/**
 * Mensaje de la clase para Telegram, con el formato que ya usan los formadores:
 *
 * *Estado:* Táchira
 * *Núcleo:* Palmira I
 * *Fecha:* 13/11/2026
 * …
 * *Repertorio:* ejercicios de acondicionamiento aeromuscular, …
 *
 * Las líneas sin dato no se ponen.
 */
export function mensajeTelegram(dia: DatosDelDia, datos: { escuela: string; formador: string; lider: string }): string {
  const lineas: [string, string][] = [
    ['Estado', INFORME_PSB.estado],
    ['Núcleo', INFORME_PSB.nucleo],
    ['Fecha', fechaCorta(dia.fecha)],
    ['Nombre del módulo', datos.escuela],
    ['Tipo de actividad', dia.tipoActividad],
    ['Formador', datos.formador],
    ['Líder del PSB', datos.lider],
    ['Estudiantes Atendidos', dia.atendidos],
    ['Niveles', dia.niveles],
    ['Personal adulto asistente', dia.adultos],
    ['Repertorio', dia.descripcion],
  ];
  return lineas
    .map(([etiqueta, valor]) => [etiqueta, valor.trim().replace(/\s*\n\s*/g, ' ')] as const)
    .filter(([, valor]) => valor)
    .map(([etiqueta, valor]) => `*${etiqueta}:* ${valor}`)
    .join('\n');
}
