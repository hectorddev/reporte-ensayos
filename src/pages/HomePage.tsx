import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ReporteMensualForm } from '../features/reporte-mensual/components/ReporteMensualForm';
import { ReportesLista } from '../features/reporte-mensual/components/ReportesLista';

type Vista = 'nuevo' | 'lista';

const CLAVE_ADMIN_DESBLOQUEADO = 'admin_desbloqueado';
const TOQUES_PARA_ADMIN = 7;

export function HomePage() {
  const [vista, setVista] = useState<Vista>('nuevo');
  const [adminVisible, setAdminVisible] = useState(
    () => localStorage.getItem(CLAVE_ADMIN_DESBLOQUEADO) === '1'
  );
  const toquesNuevo = useRef(0);
  const queryClient = useQueryClient();

  const irALista = () => {
    queryClient.invalidateQueries({ queryKey: ['reportes-mensuales'] });
    setVista('lista');
  };

  // Easter egg: 7 toques en "Nuevo reporte" revelan la opción Admin.
  const irANuevo = () => {
    setVista('nuevo');
    if (adminVisible) return;
    toquesNuevo.current += 1;
    if (toquesNuevo.current >= TOQUES_PARA_ADMIN) {
      localStorage.setItem(CLAVE_ADMIN_DESBLOQUEADO, '1');
      setAdminVisible(true);
    }
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
            onClick={irANuevo}
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
          {adminVisible && (
            <Link to="/admin" className="nav-btn nav-link">
              Admin
            </Link>
          )}
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
