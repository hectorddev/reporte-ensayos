import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import { listarPlantillas, listarSolicitudes } from '../../constancias/api/constancias.api';
import { tituloPlantilla } from '../../constancias/lib/plantillas';
import { fechaLegible } from '../../constancias/lib/textoConstancia';
import {
  ESTADOS_CONSTANCIA,
  tituloTipo,
  type EstadoConstancia,
} from '../../constancias/types/constancia.types';

type Filtro = EstadoConstancia | 'todas';

export function AdminConstanciasPage() {
  return <AccesoCoordinacion>{(clave) => <Bandeja clave={clave} />}</AccesoCoordinacion>;
}

function Bandeja({ clave }: { clave: string }) {
  const [filtro, setFiltro] = useState<Filtro>('pendiente');
  const [plantilla, setPlantilla] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const solicitudes = useQuery({
    queryKey: ['admin-constancias'],
    queryFn: () => listarSolicitudes(clave),
  });
  const plantillas = useQuery({
    queryKey: ['admin-plantillas'],
    queryFn: () => listarPlantillas(clave),
  });

  const constancias = solicitudes.data ?? [];
  const texto = busqueda.trim().toLowerCase();
  const visibles = constancias.filter(
    (c) =>
      (filtro === 'todas' || c.estado === filtro) &&
      (!plantilla || c.plantilla === plantilla) &&
      (!texto ||
        c.codigo.toLowerCase().includes(texto) ||
        c.estudianteNombre.toLowerCase().includes(texto) ||
        c.representanteNombre.toLowerCase().includes(texto))
  );
  const pendientes = constancias.filter((c) => c.estado === 'pendiente').length;
  const nombrePlantilla = new Map((plantillas.data ?? []).map((p) => [p.codigo, tituloPlantilla(p)]));

  return (
    <div className="admin-dashboard">
      <div className="reportes-lista-header">
        <h2>
          Constancias {pendientes > 0 && <span className="estado-badge pendiente">{pendientes} por revisar</span>}
        </h2>
        <div className="admin-acciones">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => solicitudes.refetch()}
            disabled={solicitudes.isFetching}
          >
            {solicitudes.isFetching ? 'Actualizando…' : 'Actualizar'}
          </button>
          <Link to="/admin/constancias/plantillas" className="btn btn-secondary">
            Plantillas
          </Link>
          <Link to="/admin/constancias/nueva" className="btn btn-primary">
            Nueva constancia
          </Link>
        </div>
      </div>

      <div className="reportes-filtros">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label="Filtrar por estado">
          <option value="pendiente">{ESTADOS_CONSTANCIA.pendiente}</option>
          <option value="aprobada">Aprobadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="todas">Todas</option>
        </select>
        <select value={plantilla} onChange={(e) => setPlantilla(e.target.value)} aria-label="Filtrar por plantilla">
          <option value="">Todas las plantillas</option>
          {(plantillas.data ?? []).map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {tituloPlantilla(p)}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Buscar por código, estudiante o representante"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar"
        />
      </div>

      {solicitudes.isLoading && <p>Cargando constancias…</p>}
      {solicitudes.error && (
        <div className="alert-error">
          {solicitudes.error instanceof Error ? solicitudes.error.message : 'No se pudieron cargar las constancias.'}
        </div>
      )}

      {!solicitudes.isLoading && !solicitudes.error && visibles.length === 0 && (
        <div className="reportes-vacio">
          <p>{constancias.length === 0 ? 'Aún no hay solicitudes.' : 'Ninguna coincide con el filtro.'}</p>
        </div>
      )}

      {visibles.length > 0 && (
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
                  <td>
                    {tituloTipo(c.tipo)}
                    {c.plantilla && nombrePlantilla.has(c.plantilla) && (
                      <span className="celda-plantilla">{nombrePlantilla.get(c.plantilla)}</span>
                    )}
                  </td>
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
