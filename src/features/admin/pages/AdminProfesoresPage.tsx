import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import {
  eliminarProfesor,
  guardarProfesor,
  listarProfesores,
  type Profesor,
} from '../../profesores/api/profesores.api';
import { AGRUPACIONES, buscarAgrupacion } from '../../../lib/datosEstaticos';
import { normalizarCedula } from '../../../lib/profesorAuth';
import { enlaceWhatsApp } from '../../constancias/lib/utilidades';
import { formatoCedula, nombrePersona } from '../../constancias/lib/textoConstancia';

/** /admin/profesores: quién puede registrar reportes y de qué agrupaciones. */
export function AdminProfesoresPage() {
  return <AccesoCoordinacion>{(clave) => <Profesores clave={clave} />}</AccesoCoordinacion>;
}

const VACIO: Profesor = { cedula: '', nombre: '', agrupaciones: [] };

function nombreAgrupacion(id: string): string {
  return buscarAgrupacion(id)?.nombre ?? id;
}

/** Mensaje para avisarle al profesor cómo entrar. */
function mensajeAcceso(p: Profesor): string {
  const agrupaciones = p.agrupaciones.map(nombreAgrupacion).join(', ');
  return [
    `Hola ${p.nombre}.`,
    `Ya puedes registrar los reportes de ensayo${agrupaciones ? ` de ${agrupaciones}` : ''} en ${window.location.origin}/profesores`,
    'Entra con tu número de cédula.',
  ].join('\n');
}

function Profesores({ clave }: { clave: string }) {
  const queryClient = useQueryClient();
  const lista = useQuery({ queryKey: ['admin-profesores'], queryFn: () => listarProfesores(clave) });
  const [form, setForm] = useState<Profesor>(VACIO);
  /** Cédula del profesor que se está editando (null: uno nuevo). */
  const [editando, setEditando] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState<Profesor | null>(null);
  const [guardando, setGuardando] = useState(false);

  const profesores = [...(lista.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const empezar = (p: Profesor | null) => {
    setForm(p ? { ...p } : VACIO);
    setEditando(p?.cedula ?? null);
    setError('');
    setGuardado(null);
    if (p) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quedan en el orden del catálogo, no en el que se marcaron.
  const alternar = (id: string) =>
    setForm((f) => {
      const marcadas = f.agrupaciones.includes(id) ? f.agrupaciones.filter((a) => a !== id) : [...f.agrupaciones, id];
      const enCatalogo = AGRUPACIONES.map((a) => a.id).filter((a) => marcadas.includes(a));
      return { ...f, agrupaciones: [...enCatalogo, ...marcadas.filter((a) => !enCatalogo.includes(a))] };
    });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = nombrePersona(form.nombre);
    const cedula = normalizarCedula(form.cedula);
    if (!nombre) return setError('Escribe el nombre del profesor.');
    if (cedula.length < 5) return setError('Escribe la cédula completa.');
    if (form.agrupaciones.length === 0) return setError('Marca al menos una agrupación.');

    setError('');
    setGuardando(true);
    try {
      const p = await guardarProfesor(clave, { ...form, nombre, cedula }, editando ?? undefined);
      await queryClient.invalidateQueries({ queryKey: ['admin-profesores'] });
      setGuardado(p);
      setForm(VACIO);
      setEditando(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (p: Profesor) => {
    if (!window.confirm(`¿Quitar el acceso de ${p.nombre}? Sus reportes ya guardados no se borran.`)) return;
    try {
      await eliminarProfesor(clave, p.cedula);
      if (editando === p.cedula) empezar(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-profesores'] });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-edit-header">
        <div>
          <h2>Profesores</h2>
          <p className="fechas-ayuda">
            Cada profesor entra en {window.location.host}/profesores con su número de cédula y solo ve y registra los
            reportes de las agrupaciones que le asignes aquí.
          </p>
        </div>
      </div>

      {guardado && (
        <div className="alert-success profesor-guardado">
          <p>
            Listo: <strong>{guardado.nombre}</strong> ya puede entrar con su cédula.
          </p>
          <a className="btn btn-primary" href={enlaceWhatsApp('', mensajeAcceso(guardado))} target="_blank" rel="noreferrer">
            Avisarle por WhatsApp
          </a>
        </div>
      )}

      <form className="constancia-form profesor-form" onSubmit={guardar} noValidate>
        <section>
          <h3>{editando ? 'Editar profesor' : 'Registrar profesor'}</h3>
          <div className="campos-grid">
            <div>
              <label htmlFor="profesor-nombre">Nombre y apellido</label>
              <input
                id="profesor-nombre"
                type="text"
                placeholder="Ej: María Pérez"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="profesor-cedula">Cédula</label>
              <input
                id="profesor-cedula"
                type="text"
                inputMode="numeric"
                placeholder="Ej: 12345678"
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value })}
              />
              <p className="fechas-ayuda">Es con lo que entrará al sitio.</p>
            </div>
          </div>

          <fieldset className="profesor-agrupaciones">
            <legend>Agrupaciones que lleva</legend>
            {AGRUPACIONES.map((a) => (
              <label key={a.id} className={`check-linea${form.agrupaciones.includes(a.id) ? ' activo' : ''}`}>
                <input type="checkbox" checked={form.agrupaciones.includes(a.id)} onChange={() => alternar(a.id)} />
                {a.nombre}
              </label>
            ))}
          </fieldset>

          {error && <p className="error">{error}</p>}

          <div className="admin-acciones">
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar profesor'}
            </button>
            {editando && (
              <button type="button" className="btn btn-secondary" onClick={() => empezar(null)}>
                Cancelar
              </button>
            )}
          </div>
        </section>
      </form>

      <h3 className="profesores-titulo">Registrados ({profesores.length})</h3>
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
              <strong>{p.nombre}</strong>
              <span className="fechas-ayuda">C.I. {formatoCedula(p.cedula).replace('N° ', '')}</span>
              <span className="profesores-agrupaciones">
                {p.agrupaciones.length ? p.agrupaciones.map(nombreAgrupacion).join(' · ') : 'Sin agrupaciones'}
              </span>
            </div>
            <div className="admin-acciones">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => empezar(p)}>
                Editar
              </button>
              <a className="btn btn-secondary btn-sm" href={enlaceWhatsApp('', mensajeAcceso(p))} target="_blank" rel="noreferrer">
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
