import { CampoHora } from '../../constancias/components/CampoHora';
import { rangoHoras } from '../../constancias/lib/textoConstancia';
import { DIAS_HORARIO, TURNOS, type BloqueHorario } from '../lib/horario';

interface Props {
  value: BloqueHorario[];
  onChange: (horario: BloqueHorario[]) => void;
}

const esTurno = (b: BloqueHorario) => TURNOS.some((t) => t.horaInicio === b.horaInicio && t.horaFin === b.horaFin);

/**
 * Horario semanal del profesor: por cada día, mañana y tarde de un toque, y
 * «Otro horario» para lo que no encaje (ej. 3:00 a 5:30 pm).
 */
export function HorarioEditor({ value, onChange }: Props) {
  const alternarTurno = (dia: string, turno: (typeof TURNOS)[number]) => {
    const existe = value.some((b) => b.dia === dia && b.horaInicio === turno.horaInicio && b.horaFin === turno.horaFin);
    onChange(
      existe
        ? value.filter((b) => !(b.dia === dia && b.horaInicio === turno.horaInicio && b.horaFin === turno.horaFin))
        : [...value, { dia, horaInicio: turno.horaInicio, horaFin: turno.horaFin }]
    );
  };

  const cambiar = (indice: number, cambios: Partial<BloqueHorario>) =>
    onChange(value.map((b, i) => (i === indice ? { ...b, ...cambios } : b)));

  return (
    <div className="horario-semanal">
      {DIAS_HORARIO.map((dia) => {
        // Los «otros» se editan por su posición en la lista completa.
        const otros = value.map((b, i) => ({ b, i })).filter(({ b }) => b.dia === dia && !esTurno(b));
        return (
          <div key={dia} className="horario-semanal-dia" data-dia={dia}>
            <strong>{dia}</strong>
            <div className="opciones-botones turnos">
              {TURNOS.map((t) => {
                const activo = value.some((b) => b.dia === dia && b.horaInicio === t.horaInicio && b.horaFin === t.horaFin);
                return (
                  <label key={t.nombre} className={activo ? 'activo' : ''}>
                    <input type="checkbox" checked={activo} onChange={() => alternarTurno(dia, t)} />
                    <span>
                      {t.nombre}
                      <small>{rangoHoras(t.horaInicio, t.horaFin)}</small>
                    </span>
                  </label>
                );
              })}
            </div>
            {otros.map(({ b, i }) => (
              <div key={i} className="horario-fila">
                <div className="horario-celda">
                  <span>Desde</span>
                  <CampoHora
                    id={`horario-${i}-inicio`}
                    value={b.horaInicio}
                    onChange={(v) => cambiar(i, { horaInicio: v })}
                    etiqueta={`${dia}, desde`}
                  />
                </div>
                <div className="horario-celda">
                  <span>Hasta</span>
                  <CampoHora
                    id={`horario-${i}-fin`}
                    value={b.horaFin}
                    onChange={(v) => cambiar(i, { horaFin: v })}
                    etiqueta={`${dia}, hasta`}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-peligro-suave btn-sm horario-quitar"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onChange([...value, { dia, horaInicio: '', horaFin: '' }])}
            >
              + Otro horario
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Errores del horario antes de guardar (bloques incompletos o al revés). */
export function erroresHorario(horario: BloqueHorario[]): string[] {
  const errores: string[] = [];
  for (const b of horario) {
    if (!b.horaInicio || !b.horaFin) errores.push(`${b.dia}: completa la hora de inicio y de fin del otro horario, o quítalo.`);
    else if (b.horaFin <= b.horaInicio) errores.push(`${b.dia}: la hora de fin debe ser después de la de inicio. Revisa am / pm.`);
  }
  return [...new Set(errores)];
}
