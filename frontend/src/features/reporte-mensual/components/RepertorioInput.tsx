import { useEffect, useState } from 'react';

interface Props {
  temas: string[];
  onChange: (temas: string[]) => void;
  error?: string;
}

function temasIguales(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const ordenA = [...a].sort();
  const ordenB = [...b].sort();
  return ordenA.every((t, i) => t === ordenB[i]);
}

export function RepertorioInput({ temas, onChange, error }: Props) {
  const [borrador, setBorrador] = useState<string[]>(temas);
  const [nuevoTema, setNuevoTema] = useState('');
  const [guardadoOk, setGuardadoOk] = useState(false);

  const hayCambios = !temasIguales(temas, borrador);

  useEffect(() => {
    setBorrador(temas);
    setGuardadoOk(false);
  }, [temas]);

  const agregarTema = () => {
    const tema = nuevoTema.trim();
    if (!tema) return;
    if (borrador.some((t) => t.toLowerCase() === tema.toLowerCase())) return;

    setBorrador((prev) => [...prev, tema].sort((a, b) => a.localeCompare(b, 'es')));
    setNuevoTema('');
    setGuardadoOk(false);
  };

  const quitarBorrador = (tema: string) => {
    setBorrador((prev) => prev.filter((t) => t !== tema));
    setGuardadoOk(false);
  };

  const quitarGuardado = (tema: string) => {
    const nuevos = temas.filter((t) => t !== tema);
    onChange(nuevos);
    setBorrador(nuevos);
    setGuardadoOk(false);
  };

  const guardarRepertorio = () => {
    if (borrador.length === 0) return;
    onChange(borrador);
    setGuardadoOk(true);
  };

  const limpiarTodas = () => {
    setBorrador([]);
    onChange([]);
    setGuardadoOk(false);
  };

  return (
    <div className="repertorio-input">
      <div className="fechas-ensayo-header">
        <label htmlFor="nuevo-tema">Repertorio trabajado</label>
        <span className="fechas-contador">
          {temas.length} {temas.length === 1 ? 'tema guardado' : 'temas guardados'}
        </span>
      </div>

      <p className="fechas-ayuda">
        Escribe el nombre de cada tema, agrégalo a la lista y pulsa &quot;Guardar repertorio&quot;.
      </p>

      <div className="fecha-add-row">
        <input
          id="nuevo-tema"
          type="text"
          placeholder="Nombre del tema u obra..."
          value={nuevoTema}
          onChange={(e) => setNuevoTema(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregarTema();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={agregarTema}
          disabled={!nuevoTema.trim()}
        >
          Agregar tema
        </button>
      </div>

      {borrador.length > 0 && (
        <div className="fechas-lista">
          {borrador.map((tema) => (
            <span key={tema} className="fecha-chip tema-chip">
              {tema}
              <button
                type="button"
                onClick={() => quitarBorrador(tema)}
                aria-label={`Quitar ${tema} del borrador`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="fechas-acciones">
        <button
          type="button"
          className="btn btn-primary"
          onClick={guardarRepertorio}
          disabled={borrador.length === 0 || !hayCambios}
        >
          Guardar repertorio
        </button>
        {hayCambios && borrador.length > 0 && (
          <span className="fechas-pendiente">Cambios sin guardar</span>
        )}
        {guardadoOk && !hayCambios && (
          <span className="fechas-guardado-ok">Repertorio guardado</span>
        )}
      </div>

      {temas.length > 0 ? (
        <div className="fechas-seleccionadas">
          <div className="fechas-seleccionadas-header">
            <strong>Temas guardados</strong>
            <button type="button" className="btn-link" onClick={limpiarTodas}>
              Limpiar todos
            </button>
          </div>
          <div className="fechas-lista">
            {temas.map((tema) => (
              <span key={tema} className="fecha-chip tema-chip guardado">
                {tema}
                <button
                  type="button"
                  onClick={() => quitarGuardado(tema)}
                  aria-label={`Quitar ${tema}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="fechas-vacio">Aún no has guardado temas de repertorio.</p>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
