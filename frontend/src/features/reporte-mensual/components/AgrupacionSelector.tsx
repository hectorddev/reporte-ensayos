import type { Agrupacion } from '../types/reporteMensual.types';

interface Props {
  agrupaciones: Agrupacion[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  isLoading?: boolean;
}

export function AgrupacionSelector({
  agrupaciones,
  value,
  onChange,
  error,
  isLoading,
}: Props) {
  return (
    <div>
      <label htmlFor="agrupacion">Agrupación</label>
      <select
        id="agrupacion"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      >
        <option value="">— Seleccione —</option>
        {agrupaciones.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
