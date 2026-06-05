const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface Props {
  anio: number;
  mes: number;
  onChange: (anio: number, mes: number) => void;
}

function generarAnios(base: number, rango = 5): number[] {
  const anios: number[] = [];
  for (let i = base - rango; i <= base + rango; i++) {
    anios.push(i);
  }
  return anios;
}

export function PeriodoSelector({ anio, mes, onChange }: Props) {
  const anios = generarAnios(anio);

  const mesAnterior = () => {
    if (mes === 1) onChange(anio - 1, 12);
    else onChange(anio, mes - 1);
  };

  const mesSiguiente = () => {
    if (mes === 12) onChange(anio + 1, 1);
    else onChange(anio, mes + 1);
  };

  return (
    <div className="periodo-selector">
      <button
        type="button"
        className="btn btn-secondary periodo-nav"
        onClick={mesAnterior}
        aria-label="Mes anterior"
      >
        ←
      </button>

      <div className="periodo-controles">
        <select
          value={mes}
          onChange={(e) => onChange(anio, Number(e.target.value))}
          aria-label="Mes del reporte"
        >
          {MESES.map((nombre, index) => (
            <option key={nombre} value={index + 1}>
              {nombre}
            </option>
          ))}
        </select>

        <select
          value={anio}
          onChange={(e) => onChange(Number(e.target.value), mes)}
          aria-label="Año del reporte"
        >
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="btn btn-secondary periodo-nav"
        onClick={mesSiguiente}
        aria-label="Mes siguiente"
      >
        →
      </button>
    </div>
  );
}
