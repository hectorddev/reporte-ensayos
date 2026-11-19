import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CabeceraSitio } from '../components/CabeceraSitio';
import { ReporteMensualForm } from '../features/reporte-mensual/components/ReporteMensualForm';
import { ReportesLista } from '../features/reporte-mensual/components/ReportesLista';

type Vista = 'nuevo' | 'lista';

/** Profesores: reporte mensual de ensayos de su agrupación y los ya guardados. */
export function ProfesoresPage() {
  const [vista, setVista] = useState<Vista>('nuevo');
  const queryClient = useQueryClient();

  const irALista = () => {
    queryClient.invalidateQueries({ queryKey: ['reportes-mensuales'] });
    setVista('lista');
  };

  return (
    <>
      <CabeceraSitio />
      <div className="app">
        <header className="app-header">
          <p className="pagina-etiqueta">Profesores</p>
          <h1>Reportes de ensayo</h1>
          <p>Matrícula, ensayos y repertorio del mes de tu agrupación.</p>

          <nav className="app-nav" aria-label="Reportes">
            <button
              type="button"
              className={`nav-btn ${vista === 'nuevo' ? 'activo' : ''}`}
              aria-pressed={vista === 'nuevo'}
              onClick={() => setVista('nuevo')}
            >
              Nuevo reporte
            </button>
            <button
              type="button"
              className={`nav-btn ${vista === 'lista' ? 'activo' : ''}`}
              aria-pressed={vista === 'lista'}
              onClick={irALista}
            >
              Reportes guardados
            </button>
          </nav>
        </header>

        {vista === 'nuevo' ? <ReporteMensualForm onGuardadoExitoso={irALista} /> : <ReportesLista />}
      </div>
    </>
  );
}
