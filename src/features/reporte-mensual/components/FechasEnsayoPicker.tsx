import { useEffect, useMemo, useState } from 'react';

interface Props {
  anio: number;
  mes: number;
  fechas: string[];
  onChange: (fechas: string[]) => void;
  error?: string;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function toIso(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function ordenarFechas(fechas: string[]): string[] {
  return [...fechas].sort();
}

function construirCeldasCalendario(anio: number, mes: number) {
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const primerDiaSemana = (new Date(anio, mes - 1, 1).getDay() + 6) % 7;
  const celdas: Array<{ dia: number | null; iso: string | null }> = [];

  for (let i = 0; i < primerDiaSemana; i++) {
    celdas.push({ dia: null, iso: null });
  }

  for (let dia = 1; dia <= diasEnMes; dia++) {
    celdas.push({ dia, iso: toIso(anio, mes, dia) });
  }

  return celdas;
}

function fechasIguales(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const ordenadasA = ordenarFechas(a);
  const ordenadasB = ordenarFechas(b);
  return ordenadasA.every((f, i) => f === ordenadasB[i]);
}

export function FechasEnsayoPicker({ anio, mes, fechas, onChange, error }: Props) {
  const [fechasBorrador, setFechasBorrador] = useState<string[]>(fechas);
  const [guardadoOk, setGuardadoOk] = useState(false);

  const borradorSet = useMemo(() => new Set(fechasBorrador), [fechasBorrador]);
  const celdas = useMemo(() => construirCeldasCalendario(anio, mes), [anio, mes]);
  const hayCambios = !fechasIguales(fechas, fechasBorrador);

  useEffect(() => {
    setFechasBorrador(fechas);
    setGuardadoOk(false);
  }, [anio, mes, fechas]);

  const toggleDiaCalendario = (iso: string) => {
    setFechasBorrador((prev) => {
      if (prev.includes(iso)) return prev.filter((f) => f !== iso);
      return ordenarFechas([...prev, iso]);
    });
    setGuardadoOk(false);
  };

  const guardarFechas = () => {
    if (fechasBorrador.length === 0) return;
    onChange(ordenarFechas(fechasBorrador));
    setGuardadoOk(true);
  };

  const quitarFecha = (fecha: string) => {
    const nuevas = fechas.filter((f) => f !== fecha);
    onChange(nuevas);
    setFechasBorrador(nuevas);
    setGuardadoOk(false);
  };

  const limpiarTodas = () => {
    setFechasBorrador([]);
    onChange([]);
    setGuardadoOk(false);
  };

  return (
    <div className="fechas-ensayo-picker">
      <div className="fechas-ensayo-header">
        <label>Fechas de ensayos del mes</label>
        <span className="fechas-contador">
          {fechas.length} {fechas.length === 1 ? 'ensayo guardado' : 'ensayos guardados'}
        </span>
      </div>

      <p className="fechas-ayuda">
        Selecciona los días de ensayo en el calendario y pulsa &quot;Guardar fechas&quot;.
      </p>

      <div className="calendario-mes">
        <div className="calendario-grid calendario-grid-head">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="calendario-celda-head">
              {dia}
            </div>
          ))}
        </div>
        <div className="calendario-grid">
          {celdas.map((celda, index) => {
            if (!celda.dia || !celda.iso) {
              return <div key={`empty-${index}`} className="calendario-celda vacia" />;
            }

            const seleccionada = borradorSet.has(celda.iso);
            const guardada = fechas.includes(celda.iso);

            return (
              <button
                key={celda.iso}
                type="button"
                className={`calendario-celda dia ${seleccionada ? 'seleccionada' : ''} ${guardada && !hayCambios ? 'guardada' : ''}`}
                onClick={() => toggleDiaCalendario(celda.iso!)}
                aria-pressed={seleccionada}
                aria-label={`${seleccionada ? 'Quitar' : 'Agregar'} ensayo del ${formatFecha(celda.iso)}`}
              >
                {celda.dia}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fechas-acciones">
        <button
          type="button"
          className="btn btn-primary"
          onClick={guardarFechas}
          disabled={fechasBorrador.length === 0 || !hayCambios}
        >
          Guardar fechas
        </button>
        {hayCambios && fechasBorrador.length > 0 && (
          <span className="fechas-pendiente">Cambios sin guardar</span>
        )}
        {guardadoOk && !hayCambios && (
          <span className="fechas-guardado-ok">Fechas guardadas</span>
        )}
      </div>

      {fechas.length > 0 ? (
        <div className="fechas-seleccionadas">
          <div className="fechas-seleccionadas-header">
            <strong>Ensayos guardados</strong>
            <button type="button" className="btn-link" onClick={limpiarTodas}>
              Limpiar todas
            </button>
          </div>
          <div className="fechas-lista">
            {fechas.map((f) => (
              <span key={f} className="fecha-chip">
                {formatFecha(f)}
                <button
                  type="button"
                  onClick={() => quitarFecha(f)}
                  aria-label={`Quitar ensayo del ${formatFecha(f)}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="fechas-vacio">
          Selecciona días en el calendario y guarda para registrar los ensayos del mes.
        </p>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
