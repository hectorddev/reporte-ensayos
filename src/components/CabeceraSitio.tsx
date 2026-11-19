import { Link, NavLink } from 'react-router-dom';

const claseEnlace = ({ isActive }: { isActive: boolean }) => `sitio-enlace${isActive ? ' activo' : ''}`;

/** Cabecera de las páginas públicas: marca del núcleo y accesos principales. */
export function CabeceraSitio() {
  return (
    <header className="sitio-cabecera">
      <div className="sitio-cabecera-interior">
        <Link to="/" className="sitio-marca" aria-label="Núcleo Palmira I, inicio">
          <img src="/img/sitio/marca-s.png" alt="" width="40" height="40" />
          <span>
            Núcleo Palmira I
            <small>El Sistema · Táchira</small>
          </span>
        </Link>
        <nav className="sitio-nav" aria-label="Principal">
          <NavLink to="/" end className={claseEnlace}>
            Inicio
          </NavLink>
          <NavLink to="/constancias" className={claseEnlace}>
            Constancias
          </NavLink>
          <NavLink to="/profesores" className={claseEnlace}>
            Profesores
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
