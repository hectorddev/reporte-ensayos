import { useEffect, useRef, useState } from 'react';

interface Props {
  id: string;
  /** AAAA-MM-DD, o '' si está vacía o incompleta. */
  value: string;
  onChange: (iso: string) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
}

/** 2026-01-16 → 16/01/2026 */
function isoATexto(iso: string): string {
  const [a, m, d] = iso.split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
}

/** 16/01/2026 → 2026-01-16, o '' si no es una fecha real (p. ej. 31/02/2026). */
function textoAIso(texto: string): string {
  const coincide = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!coincide) return '';
  const [, d, m, a] = coincide;
  const fecha = new Date(Date.UTC(+a, +m - 1, +d));
  const real = fecha.getUTCFullYear() === +a && fecha.getUTCMonth() === +m - 1 && fecha.getUTCDate() === +d;
  return real ? `${a}-${m}-${d}` : '';
}

/** Solo dígitos, con las barras puestas solas: 16012026 → 16/01/2026. */
function conMascara(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join('/');
}

/**
 * Fecha en DD/MM/AAAA sin importar el idioma del navegador (el campo de fecha
 * nativo usa el formato del sistema, p. ej. MM/DD/AAAA en inglés). Se escribe
 * con barras automáticas o se elige en el calendario del navegador.
 */
export function CampoFecha({ id, value, onChange, onBlur, min, max }: Props) {
  const [texto, setTexto] = useState(() => isoATexto(value));
  const nativo = useRef<HTMLInputElement>(null);

  // Si el valor cambia desde fuera (reset del formulario, calendario), se refleja.
  useEffect(() => {
    if (textoAIso(texto) !== value) setTexto(isoATexto(value));
  }, [value]);

  const completa = texto.length === 10;
  const invalida = completa && !textoAIso(texto);

  const escribir = (valor: string) => {
    const t = conMascara(valor);
    setTexto(t);
    onChange(textoAIso(t));
  };

  const abrirCalendario = () => {
    const el = nativo.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  };

  return (
    <>
      <div className="campo-fecha">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/AAAA"
          maxLength={10}
          value={texto}
          onChange={(e) => escribir(e.target.value)}
          onBlur={onBlur}
          aria-invalid={invalida || undefined}
        />
        <button type="button" className="campo-fecha-boton" onClick={abrirCalendario} aria-label="Abrir calendario" title="Abrir calendario">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
        {/* Calendario del navegador: invisible, solo se usa su selector. */}
        <input
          ref={nativo}
          type="date"
          className="campo-fecha-nativo"
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            setTexto(isoATexto(e.target.value));
            onChange(e.target.value);
          }}
        />
      </div>
      {invalida && <p className="error">Esa fecha no existe. Revisa día y mes (DD/MM/AAAA).</p>}
    </>
  );
}
