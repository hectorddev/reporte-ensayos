import { useState } from 'react';

interface Props {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
}

/** Campo de contraseña con botón de ojo para ver lo que se escribe. */
export function CampoClave({ id, value, onChange, placeholder }: Props) {
  const [ver, setVer] = useState(false);
  const etiqueta = ver ? 'Ocultar contraseña' : 'Mostrar contraseña';

  return (
    <div className="campo-clave">
      <input
        id={id}
        type={ver ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="current-password"
        autoCapitalize="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="ver-clave"
        onClick={() => setVer((v) => !v)}
        aria-label={etiqueta}
        aria-pressed={ver}
        title={etiqueta}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {ver && <line x1="3" y1="3" x2="21" y2="21" />}
        </svg>
      </button>
    </div>
  );
}
