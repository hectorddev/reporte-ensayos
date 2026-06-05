import { useEffect, useState } from 'react';
import {
  CATEGORIAS_DEMOGRAFICAS,
  MATRICULA_VACIA,
  totalMatricula,
  type Matricula,
} from '../types/reporteMensual.types';

interface Props {
  matricula: Matricula;
  onChange: (matricula: Matricula) => void;
  error?: string;
}

function matriculaIgual(a: Matricula, b: Matricula): boolean {
  return CATEGORIAS_DEMOGRAFICAS.every(({ key }) => a[key] === b[key]);
}

export function MatriculaPanel({ matricula, onChange, error }: Props) {
  const [borrador, setBorrador] = useState<Matricula>(matricula);
  const [guardadoOk, setGuardadoOk] = useState(false);

  const hayCambios = !matriculaIgual(matricula, borrador);
  const totalBorrador = totalMatricula(borrador);
  const totalGuardado = totalMatricula(matricula);

  useEffect(() => {
    setBorrador(matricula);
    setGuardadoOk(false);
  }, [matricula]);

  const actualizarCampo = (key: keyof Matricula, valor: string) => {
    const numero = valor === '' ? 0 : Math.max(0, parseInt(valor, 10) || 0);
    setBorrador((prev) => ({ ...prev, [key]: numero }));
    setGuardadoOk(false);
  };

  const guardarMatricula = () => {
    onChange(borrador);
    setGuardadoOk(true);
  };

  const limpiar = () => {
    setBorrador(MATRICULA_VACIA);
    onChange(MATRICULA_VACIA);
    setGuardadoOk(false);
  };

  return (
    <div className="matricula-panel">
      <div className="fechas-ensayo-header">
        <h3>Matrícula del mes</h3>
        <span className="fechas-contador">
          Total: {totalGuardado}
        </span>
      </div>

      <p className="fechas-ayuda">
        Ingresa la cantidad real de integrantes activos por categoría y pulsa &quot;Guardar matrícula&quot;.
      </p>

      <div className="demografia-grid">
        {CATEGORIAS_DEMOGRAFICAS.map(({ key, label }) => (
          <div key={key} className="demografia-item editable">
            <label htmlFor={`matricula-${key}`}>{label}</label>
            <input
              id={`matricula-${key}`}
              type="number"
              min={0}
              step={1}
              value={borrador[key] === 0 ? '' : borrador[key]}
              placeholder="0"
              onChange={(e) => actualizarCampo(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="total-activos">
        <strong>Total en borrador:</strong> {totalBorrador}
      </div>

      <div className="fechas-acciones">
        <button
          type="button"
          className="btn btn-primary"
          onClick={guardarMatricula}
          disabled={!hayCambios}
        >
          Guardar matrícula
        </button>
        <button type="button" className="btn btn-secondary" onClick={limpiar}>
          Limpiar
        </button>
        {hayCambios && (
          <span className="fechas-pendiente">Cambios sin guardar</span>
        )}
        {guardadoOk && !hayCambios && (
          <span className="fechas-guardado-ok">Matrícula guardada</span>
        )}
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
