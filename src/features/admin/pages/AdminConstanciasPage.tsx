import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLogin } from '../components/AdminLogin';
import { isAdminAuthenticated } from '../../../lib/adminAuth';
import { leerHistorial } from '../../constancias/lib/historial';
import { fechaLegible } from '../../constancias/lib/textoConstancia';
import {
  ESTADOS_CONSTANCIA,
  tituloTipo,
  type EstadoConstancia,
} from '../../constancias/types/constancia.types';

type Filtro = EstadoConstancia | 'todas';

export function AdminConstanciasPage() {
  const [autenticado, setAutenticado] = useState(isAdminAuthenticated());
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busqueda, setBusqueda] = useState('');

  if (!autenticado) {
    return <AdminLogin onLogin={() => setAutenticado(true)} />;
  }

  const constancias = leerHistorial();
  const texto = busqueda.trim().toLowerCase();
  const visibles = constancias.filter(
    (c) =>
      (filtro === 'todas' || c.estado === filtro) &&
      (!texto ||
        c.codigo.toLowerCase().includes(texto) ||
        c.estudianteNombre.toLowerCase().includes(texto) ||
        c.representanteNombre.toLowerCase().includes(texto))
  );
  const pendientes = constancias.filter((c) => c.estado === 'pendiente').length;

  return (
    <div className="admin-dashboard">
      <div className="reportes-lista-header">
        <h2>
          Constancias {pendientes > 0 && <span className="estado-badge pendiente">{pendientes} por revisar</span>}
        </h2>
        <div className="admin-acciones">
          <Link to="/admin/constancias/plantillas" className="btn btn-secondary">
            Plantillas
          </Link>
          <Link to="/admin/constancias/nueva" className="btn btn-primary">
            Nueva constancia
          </Link>
        </div>
      </div>

      <p className="fechas-ayuda">
        Las solicitudes llegan por WhatsApp: abre el enlace del mensaje para revisarla. Aquí queda
        el historial de las que abriste en este dispositivo.
      </p>

      <div className="reportes-filtros">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
          aria-label="Filtrar por estado"
        >
          <option value="todas">Todas</option>
          <option value="pendiente">{ESTADOS_CONSTANCIA.pendiente}</option>
          <option value="aprobada">Aprobadas</option>
          <option value="rechazada">Rechazadas</option>
        </select>
        <input
          type="search"
          placeholder="Buscar por código, estudiante o representante"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar"
        />
      </div>

      {visibles.length === 0 ? (
        <div className="reportes-vacio">
          <p>{constancias.length === 0 ? 'Aún no hay constancias en este dispositivo.' : 'Ninguna coincide con el filtro.'}</p>
        </div>
      ) : (
        <div className="reportes-tabla-wrap">
          <table className="reportes-tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Solicitada</th>
                <th>Tipo</th>
                <th>Estudiante</th>
                <th>Agrupación</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.codigo}>
                  <td className="celda-codigo"><strong>{c.codigo}</strong></td>
                  <td>{fechaLegible(c.creadoEn)}</td>
                  <td>{tituloTipo(c.tipo)}</td>
                  <td>{c.estudianteNombre}</td>
                  <td>{c.agrupacionNombre}</td>
                  <td>
                    <span className={`estado-badge ${c.estado}`}>{ESTADOS_CONSTANCIA[c.estado]}</span>
                  </td>
                  <td>
                    <Link to={`/admin/constancias/${c.codigo}`} className="btn btn-primary btn-sm">
                      {c.estado === 'pendiente' ? 'Revisar' : 'Abrir'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
