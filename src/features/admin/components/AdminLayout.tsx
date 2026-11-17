import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cerrarSesion as cerrarSesionPanel } from '../../../lib/adminAuth';

const claseNav = ({ isActive }: { isActive: boolean }) => `nav-btn nav-link ${isActive ? 'activo' : ''}`;

export function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Al navegar se cierra el menú del celular.
  useEffect(() => setMenuAbierto(false), [pathname]);

  const cerrarSesion = () => {
    cerrarSesionPanel();
    navigate('/admin');
    window.location.reload();
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div>
          <h1>Panel de administración</h1>
          <p>Gestiona reportes mensuales y constancias</p>
          <nav className="app-nav solo-escritorio">
            <NavLink to="/admin" end className={claseNav}>
              Reportes
            </NavLink>
            <NavLink to="/admin/constancias" className={claseNav}>
              Constancias
            </NavLink>
          </nav>
        </div>
        <div className="admin-header-actions solo-escritorio">
          <Link to="/" className="btn btn-secondary">
            Volver al sitio
          </Link>
          <button type="button" className="btn btn-secondary" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>

        <button
          type="button"
          className="boton-menu solo-celular"
          aria-expanded={menuAbierto}
          aria-controls="menu-admin"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuAbierto((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menuAbierto ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {menuAbierto && (
        <nav id="menu-admin" className="menu-admin solo-celular">
          <NavLink to="/admin" end className="menu-admin-item">
            Reportes
          </NavLink>
          <NavLink to="/admin/constancias" end className="menu-admin-item">
            Constancias
          </NavLink>
          <NavLink to="/admin/constancias/plantillas" className="menu-admin-item">
            Plantillas
          </NavLink>
          <Link to="/" className="menu-admin-item">
            Volver al sitio
          </Link>
          <button type="button" className="menu-admin-item" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </nav>
      )}

      <Outlet />
    </div>
  );
}
