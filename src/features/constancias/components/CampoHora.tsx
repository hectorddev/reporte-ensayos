import { useState } from 'react';

interface Props {
  id: string;
  /** HH:MM en 24 horas, o '' si está vacía. */
  value: string;
  onChange: (hhmm: string) => void;
  onBlur?: () => void;
  /** Texto para lectores de pantalla, p. ej. «Desde». */
  etiqueta?: string;
}

const HORAS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

interface Partes {
  hora: number; // 1–12
  minutos: string;
  pm: boolean;
}

function partir(hhmm: string): Partes | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return null;
  const h24 = Number(m[1]);
  return { hora: h24 % 12 === 0 ? 12 : h24 % 12, minutos: m[2], pm: h24 >= 12 };
}

function unir({ hora, minutos, pm }: Partes): string {
  const h24 = (hora % 12) + (pm ? 12 : 0);
  return `${String(h24).padStart(2, '0')}:${minutos}`;
}

/** Sugerencia al elegir la hora: de 7 a 11 por la mañana; el resto, de tarde. */
const pmSugerido = (hora: number) => hora < 7 || hora === 12;

/**
 * Hora en formato de 12 horas con am/pm a la vista, sin importar el idioma o
 * la configuración del equipo (el campo nativo muestra 24 h en muchos PC).
 * Al elegir la hora se propone am o pm; se puede cambiar con un toque.
 */
export function CampoHora({ id, value, onChange, onBlur, etiqueta }: Props) {
  const partes = partir(value);
  // Si la persona eligió am/pm a mano, ya no se le cambia al mover la hora.
  const [tocado, setTocado] = useState(!!partes);
  const [pmManual, setPmManual] = useState<boolean | null>(null);

  const elegirHora = (texto: string) => {
    if (!texto) return onChange('');
    const hora = Number(texto);
    const pm = tocado ? (partes?.pm ?? pmManual ?? pmSugerido(hora)) : pmSugerido(hora);
    onChange(unir({ hora, minutos: partes?.minutos ?? '00', pm }));
  };

  const elegirMinutos = (minutos: string) => {
    if (partes) onChange(unir({ ...partes, minutos }));
  };

  const elegirPeriodo = (pm: boolean) => {
    setTocado(true);
    if (partes) onChange(unir({ ...partes, pm }));
    else setPmManual(pm);
  };

  const pmActual = partes ? partes.pm : pmManual;
  // Un valor guardado con minutos fuera de la lista (p. ej. 14:07) se conserva.
  const minutos = partes && !MINUTOS.includes(partes.minutos) ? [...MINUTOS, partes.minutos].sort() : MINUTOS;
  const nombre = etiqueta ? `${etiqueta}: ` : '';

  return (
    <div className="campo-hora" onBlur={onBlur}>
      <select id={id} aria-label={`${nombre}hora`} value={partes ? String(partes.hora) : ''} onChange={(e) => elegirHora(e.target.value)}>
        <option value="">--</option>
        {HORAS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="campo-hora-separador" aria-hidden="true">
        :
      </span>
      <select
        aria-label={`${nombre}minutos`}
        value={partes?.minutos ?? '00'}
        disabled={!partes}
        onChange={(e) => elegirMinutos(e.target.value)}
      >
        {minutos.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <div className="campo-hora-periodo" role="group" aria-label={`${nombre}am o pm`}>
        <button type="button" aria-pressed={pmActual === false} onClick={() => elegirPeriodo(false)}>
          am
        </button>
        <button type="button" aria-pressed={pmActual === true} onClick={() => elegirPeriodo(true)}>
          pm
        </button>
      </div>
    </div>
  );
}
