import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import { eliminarProfesor, listarProfesores, type Profesor } from '../../profesores/api/profesores.api';
import { useCatalogoAgrupaciones } from '../../../lib/agrupaciones';
import { enlaceWhatsApp } from '../../constancias/lib/utilidades';
import { formatoCedula } from '../../constancias/lib/textoConstancia';
import { resumenHorario } from '../../profesores/lib/horario';
import { mensajeAcceso, nombresAgrupaciones, nombresEscuelas, nombresProgramas } from '../../profesores/lib/perfil';

/** /admin/profesores: lista de profesores; cada uno abre su perfil. */
export function AdminProfesoresPage() {
  return <AccesoCoordinacion>{(clave) => <Profesores clave={clave} />}</AccesoCoordinacion>;
}

function Profesores({ clave }: { clave: string }) {
  const queryClient = useQueryClient();
  const lista = useQuery({ queryKey: ['admin-profesores'], queryFn: () => listarProfesores(clave) });
  const { data: catalogo } = useCatalogoAgrupaciones();
  const profesores = [...(lista.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const eliminar = async (p: Profesor) => {
    if (!window.confirm(`¿Quitar el acceso de ${p.nombre}? Sus reportes e informes ya guardados no se borran.`)) return;
    try {
      await eliminarProfesor(clave, p.cedula);
      await queryClient.invalidateQueries({ queryKey: ['admin-profesores'] });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="reportes-lista-header">
        <div>
          <h2>Profesores ({profesores.length})</h2>
          <p className="fechas-ayuda">
            Cada profesor entra en {window.location.host}/profesores con su número de cédula. Toca su nombre para ver y
            editar su perfil: programas, agrupaciones, escuelas y horario.
          </p>
        </div>
        <Link to="/admin/profesores/nuevo" className="btn btn-primary">
          + Registrar profesor
        </Link>
      </div>

      {lista.isLoading && <p>Cargando profesores…</p>}
      {lista.error && (
        <div className="alert-error">{lista.error instanceof Error ? lista.error.message : 'No se pudo cargar la lista.'}</div>
      )}
      {!lista.isLoading && !lista.error && profesores.length === 0 && (
        <p className="fechas-ayuda">Todavía no hay profesores registrados.</p>
      )}

      <ul className="profesores-lista">
        {profesores.map((p) => (
          <li key={p.cedula}>
            <div>
              <Link to={`/admin/profesores/${p.cedula}`} className="profesor-nombre">
                {p.nombre}
              </Link>
              <span className="fechas-ayuda">C.I. {formatoCedula(p.cedula).replace('N° ', '')}</span>
              <span className="profesores-programas">
                {p.programas.length ? nombresProgramas(p.programas).join(' · ') : 'Sin programa asignado'}
              </span>
              {p.agrupaciones.length > 0 && (
                <span className="profesores-agrupaciones">{nombresAgrupaciones(p.agrupaciones, catalogo).join(' · ')}</span>
              )}
              {p.modulos.length > 0 && (
                <span className="profesores-agrupaciones">Escuelas: {nombresEscuelas(p.modulos).join(' · ')}</span>
              )}
              <span className="fechas-ayuda">
                {p.horario?.length ? `Horario: ${resumenHorario(p.horario)}` : 'Sin horario cargado'}
              </span>
            </div>
            <div className="admin-acciones">
              <Link to={`/admin/profesores/${p.cedula}`} className="btn btn-secondary btn-sm">
                Ver perfil
              </Link>
              <a
                className="btn btn-secondary btn-sm"
                href={enlaceWhatsApp('', mensajeAcceso(p, catalogo))}
                target="_blank"
                rel="noreferrer"
              >
                Avisar por WhatsApp
              </a>
              <button type="button" className="btn btn-peligro-suave btn-sm" onClick={() => eliminar(p)}>
                Quitar acceso
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
