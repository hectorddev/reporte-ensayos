import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import {
  eliminarProfesor,
  guardarProfesor,
  listarProfesores,
  type Profesor,
} from '../../profesores/api/profesores.api';
import {
  AGRUPACIONES,
  MODULOS_PSB,
  PROGRAMAS,
  PROGRAMA_PSB,
  nombreEnCatalogo,
  type ElementoCatalogo,
} from '../../../lib/datosEstaticos';
import { normalizarCedula } from '../../../lib/profesorAuth';
import { enlaceWhatsApp } from '../../constancias/lib/utilidades';
import { formatoCedula, nombrePersona } from '../../constancias/lib/textoConstancia';

/** /admin/profesores: quién puede registrar reportes, en qué programas, agrupaciones y escuelas. */
export function AdminProfesoresPage() {
  return <AccesoCoordinacion>{(clave) => <Profesores clave={clave} />}</AccesoCoordinacion>;
}

const VACIO: Profesor = { cedula: '', nombre: '', agrupaciones: [], programas: [], modulos: [] };

type Lista = 'agrupaciones' | 'programas' | 'modulos';
const CATALOGOS: Record<Lista, ElementoCatalogo[]> = {
  agrupaciones: AGRUPACIONES,
  programas: PROGRAMAS,
  modulos: MODULOS_PSB,
};

const nombres = (lista: Lista, ids: string[]) => ids.map((id) => nombreEnCatalogo(CATALOGOS[lista], id));

/** ¿Tiene programas de la sede (además o en vez de Simón Bolívar)? */
const tieneSede = (p: Profesor) => p.programas.some((id) => id !== PROGRAMA_PSB);
const tienePSB = (p: Profesor) => p.programas.includes(PROGRAMA_PSB);

/** Mensaje para avisarle al profesor cómo entrar. */
function mensajeAcceso(p: Profesor): string {
  const que: string[] = [];
  if (p.agrupaciones.length) que.push(`los reportes de ensayo de ${nombres('agrupaciones', p.agrupaciones).join(', ')}`);
  if (tienePSB(p) && p.modulos.length) {
    que.push(`los informes del Programa Simón Bolívar de ${nombres('modulos', p.modulos).join(', ')}`);
  }
  return [
    `Hola ${p.nombre}.`,
    `Ya puedes registrar ${que.join(' y ') || 'tus reportes'} en ${window.location.origin}/profesores`,
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
    setForm(p ? { ...VACIO, ...p } : VACIO);
    setEditando(p?.cedula ?? null);
    setError('');
    setGuardado(null);
    if (p) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quedan en el orden del catálogo, no en el que se marcaron.
  const alternar = (lista: Lista, id: string) =>
    setForm((f) => {
      const marcadas = f[lista].includes(id) ? f[lista].filter((a) => a !== id) : [...f[lista], id];
      const enCatalogo = CATALOGOS[lista].map((a) => a.id).filter((a) => marcadas.includes(a));
      return { ...f, [lista]: [...enCatalogo, ...marcadas.filter((a) => !enCatalogo.includes(a))] };
    });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = nombrePersona(form.nombre);
    const cedula = normalizarCedula(form.cedula);
    if (!nombre) return setError('Escribe el nombre del profesor.');
    if (cedula.length < 5) return setError('Escribe la cédula completa.');
    if (form.programas.length === 0) return setError('Marca al menos un programa.');
    if (tieneSede(form) && form.agrupaciones.length === 0) return setError('Marca al menos una agrupación de la sede.');
    if (tienePSB(form) && form.modulos.length === 0) return setError('Marca al menos una escuela del Programa Simón Bolívar.');

    // Lo que no corresponde a sus programas no se guarda.
    const profesor: Profesor = {
      ...form,
      nombre,
      cedula,
      agrupaciones: tieneSede(form) ? form.agrupaciones : [],
      modulos: tienePSB(form) ? form.modulos : [],
    };
    setError('');
    setGuardando(true);
    try {
      const p = await guardarProfesor(clave, profesor, editando ?? undefined);
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
    if (!window.confirm(`¿Quitar el acceso de ${p.nombre}? Sus reportes e informes ya guardados no se borran.`)) return;
    try {
      await eliminarProfesor(clave, p.cedula);
      if (editando === p.cedula) empezar(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-profesores'] });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  };

  const casillas = (lista: Lista, leyenda: string, ayuda?: string) => (
    <fieldset className="profesor-agrupaciones" data-lista={lista}>
      <legend>{leyenda}</legend>
      {ayuda && <p className="fechas-ayuda profesor-ayuda">{ayuda}</p>}
      {CATALOGOS[lista].map((a) => (
        <label key={a.id} className={`check-linea${form[lista].includes(a.id) ? ' activo' : ''}`}>
          <input type="checkbox" checked={form[lista].includes(a.id)} onChange={() => alternar(lista, a.id)} />
          {a.nombre}
        </label>
      ))}
    </fieldset>
  );

  return (
    <div className="admin-dashboard">
      <div className="admin-edit-header">
        <div>
          <h2>Profesores</h2>
          <p className="fechas-ayuda">
            Cada profesor entra en {window.location.host}/profesores con su número de cédula. Ve los reportes de ensayo de
            las agrupaciones que le asignes y, si está en el Programa Simón Bolívar, los informes de sus escuelas.
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

          {casillas('programas', 'Programas en los que está', 'Puede estar en varios.')}
          {tieneSede(form) && casillas('agrupaciones', 'Agrupaciones de la sede que lleva', 'Para los reportes de ensayo.')}
          {tienePSB(form) &&
            casillas('modulos', 'Escuelas del Programa Simón Bolívar', 'Solo podrá hacer informes de estas escuelas.')}

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
              <span className="profesores-programas">
                {p.programas.length ? nombres('programas', p.programas).join(' · ') : 'Sin programa asignado'}
              </span>
              {p.agrupaciones.length > 0 && (
                <span className="profesores-agrupaciones">{nombres('agrupaciones', p.agrupaciones).join(' · ')}</span>
              )}
              {p.modulos.length > 0 && (
                <span className="profesores-agrupaciones">Escuelas: {nombres('modulos', p.modulos).join(' · ')}</span>
              )}
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
