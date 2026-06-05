import { Link, Outlet, useNavigate } from 'react-router-dom';
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
          <p>Gestiona y edita todos los reportes mensuales</p>
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
