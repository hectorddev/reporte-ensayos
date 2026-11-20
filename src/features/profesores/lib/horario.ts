import { rangoHoras } from '../../constancias/lib/textoConstancia';

/** Un bloque de trabajo semanal del profesor: «Lunes de 8:00 am a 12:00 pm». */
export interface BloqueHorario {
  dia: string;
  horaInicio: string; // HH:MM
  horaFin: string;
}

export const DIAS_HORARIO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Turnos de un toque al cargar el horario (lo más común en el núcleo). */
export const TURNOS = [
  { nombre: 'Mañana', horaInicio: '08:00', horaFin: '12:00' },
  { nombre: 'Tarde', horaInicio: '14:00', horaFin: '18:00' },
];

const orden = (d: string) => {
  const i = DIAS_HORARIO.indexOf(d);
  return i < 0 ? 99 : i;
};

export function ordenarHorario(bloques: BloqueHorario[]): BloqueHorario[] {
  return [...bloques].sort((a, b) => orden(a.dia) - orden(b.dia) || a.horaInicio.localeCompare(b.horaInicio));
}

/** Por día: [{ dia: 'Lunes', texto: '8:00 am a 12:00 pm y 2:00 pm a 6:00 pm' }] */
export function horarioPorDia(bloques: BloqueHorario[]): { dia: string; texto: string }[] {
  const dias: { dia: string; texto: string }[] = [];
  for (const b of ordenarHorario(bloques)) {
    const rango = rangoHoras(b.horaInicio, b.horaFin);
    const ultimo = dias.at(-1);
    if (ultimo?.dia === b.dia) ultimo.texto += ` y ${rango}`;
    else dias.push({ dia: b.dia, texto: rango });
  }
  return dias;
}

/** Una línea: «Lun 8:00 am a 12:00 pm · Mar 2:00 pm a 6:00 pm» */
export function resumenHorario(bloques: BloqueHorario[]): string {
  return horarioPorDia(bloques)
    .map((d) => `${d.dia.slice(0, 3)} ${d.texto}`)
    .join(' · ');
}
