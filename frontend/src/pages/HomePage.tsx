import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ReporteMensualForm } from '../features/reporte-mensual/components/ReporteMensualForm';
import { ReportesLista } from '../features/reporte-mensual/components/ReportesLista';

type Vista = 'nuevo' | 'lista';

export function HomePage() {
  const [vista, setVista] = useState<Vista>('nuevo');
  const queryClient = useQueryClient();

  const irALista = () => {
    queryClient.invalidateQueries({ queryKey: ['reportes-mensuales'] });
    setVista('lista');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Reporte de Ensayos</h1>
        <p>Indicadores mensuales de agrupaciones musicales</p>

        <nav className="app-nav">
          <button
            type="button"
            className={`nav-btn ${vista === 'nuevo' ? 'activo' : ''}`}
            onClick={() => setVista('nuevo')}
          >
            Nuevo reporte
          </button>
          <button
            type="button"
            className={`nav-btn ${vista === 'lista' ? 'activo' : ''}`}
            onClick={irALista}
          >
            Reportes guardados
          </button>
          <Link to="/admin" className="nav-btn nav-link">
            Admin
          </Link>
        </nav>
      </header>

      {vista === 'nuevo' ? (
        <ReporteMensualForm onGuardadoExitoso={irALista} />
      ) : (
        <ReportesLista />
      )}
    </div>
  );
}
