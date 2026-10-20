import { SolicitarConstancia } from '../features/constancias/components/SolicitarConstancia';

/** Página para representantes: /constancias */
export function ConstanciasPage() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Solicitar constancia</h1>
        <p>Horario, participación en agrupación, conciertos y ensayos</p>
      </header>

      <SolicitarConstancia />
    </div>
  );
}
