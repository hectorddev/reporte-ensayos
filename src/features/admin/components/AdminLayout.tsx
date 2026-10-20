import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAdminPassword } from '../../../lib/adminAuth';

export function AdminLayout() {
  const navigate = useNavigate();

  const cerrarSesion = () => {
    clearAdminPassword();
    navigate('/admin');
    window.location.reload();
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div>
          <h1>Panel de administración</h1>
          <p>Gestiona reportes mensuales y constancias</p>
          <nav className="app-nav">
            <NavLink to="/admin" end className={({ isActive }) => `nav-btn nav-link ${isActive ? 'activo' : ''}`}>
              Reportes
            </NavLink>
            <NavLink
              to="/admin/constancias"
              className={({ isActive }) => `nav-btn nav-link ${isActive ? 'activo' : ''}`}
            >
              Constancias
            </NavLink>
          </nav>
        </div>
        <div className="admin-header-actions">
          <Link to="/" className="btn btn-secondary">
            Volver al sitio
          </Link>
          <button type="button" className="btn btn-secondary" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
