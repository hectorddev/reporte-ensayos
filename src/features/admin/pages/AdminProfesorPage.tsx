import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import { guardarProfesor, listarProfesores, type Profesor } from '../../profesores/api/profesores.api';
import { HorarioEditor, erroresHorario } from '../../profesores/components/HorarioEditor';
import { horarioPorDia, ordenarHorario } from '../../profesores/lib/horario';
import { PROFESOR_VACIO, mensajeAcceso, tienePSB, tieneSede } from '../../profesores/lib/perfil';
import { useCatalogoAgrupaciones } from '../../../lib/agrupaciones';
import { MODULOS_PSB, PROGRAMAS, type ElementoCatalogo } from '../../../lib/datosEstaticos';
import { normalizarCedula } from '../../../lib/profesorAuth';
import { enlaceWhatsApp } from '../../constancias/lib/utilidades';
import { nombrePersona } from '../../constancias/lib/textoConstancia';

/** /admin/profesores/nuevo | /admin/profesores/:cedula: perfil del profesor. */
export function AdminProfesorPage() {
  return <AccesoCoordinacion>{(clave) => <CargarProfesor clave={clave} />}</AccesoCoordinacion>;
}

function CargarProfesor({ clave }: { clave: string }) {
  const { cedula = 'nuevo' } = useParams<{ cedula: string }>();
  const nuevo = cedula === 'nuevo';
  const lista = useQuery({ queryKey: ['admin-profesores'], queryFn: () => listarProfesores(clave), enabled: !nuevo });

  if (nuevo) return <PerfilProfesor key="nuevo" clave={clave} />;
  if (lista.isLoading) return <p>Cargando perfil…</p>;
  const profesor = lista.data?.find((p) => p.cedula === cedula);
  if (!profesor) {
    return (
      <div className="admin-dashboard">
        <div className="alert-error">
          {lista.error instanceof Error ? lista.error.message : 'No se encontró ese profesor.'}
        </div>
        <Link to="/admin/profesores" className="btn btn-secondary">
          ← Volver a profesores
        </Link>
      </div>
    );
  }
  return <PerfilProfesor key={profesor.cedula} clave={clave} inicial={profesor} />;
}

type Lista = 'agrupaciones' | 'programas' | 'modulos';

function PerfilProfesor({ clave, inicial }: { clave: string; inicial?: Profesor }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Al registrar uno nuevo se pasa a la dirección de su perfil: el aviso viaja con la navegación.
  const location = useLocation();
  const estadoNavegacion = location.state as { guardado?: Profesor; nuevo?: boolean } | null;
  const { data: catalogo } = useCatalogoAgrupaciones();
  const [form, setForm] = useState<Profesor>(inicial ? { ...PROFESOR_VACIO, ...inicial } : PROFESOR_VACIO);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardado, setGuardado] = useState<Profesor | null>(estadoNavegacion?.guardado ?? null);
  const [recienRegistrado, setRecienRegistrado] = useState(!!estadoNavegacion?.nuevo);

  // Ya mostrado: que no vuelva a salir al recargar la página.
  useEffect(() => {
    if (estadoNavegacion?.guardado) navigate(location.pathname, { replace: true, state: null });
  }, [estadoNavegacion, location.pathname, navigate]);
  const [guardando, setGuardando] = useState(false);

  // Agrupaciones activas, más las inactivas que ya tenga asignadas.
  const catalogos: Record<Lista, ElementoCatalogo[]> = {
    programas: PROGRAMAS,
    modulos: MODULOS_PSB,
    agrupaciones: catalogo
      .filter((a) => a.activa || form.agrupaciones.includes(a.id))
      .map((a) => ({ id: a.id, nombre: a.activa ? a.nombre : `${a.nombre} (inactiva)` })),
  };

  // Quedan en el orden del catálogo, no en el que se marcaron.
  const alternar = (lista: Lista, id: string) =>
    setForm((f) => {
      const marcadas = f[lista].includes(id) ? f[lista].filter((a) => a !== id) : [...f[lista], id];
      const enCatalogo = catalogos[lista].map((a) => a.id).filter((a) => marcadas.includes(a));
      return { ...f, [lista]: [...enCatalogo, ...marcadas.filter((a) => !enCatalogo.includes(a))] };
    });

  const casillas = (lista: Lista, leyenda: string, ayuda?: string) => (
    <fieldset className="profesor-agrupaciones" data-lista={lista}>
      <legend>{leyenda}</legend>
      {ayuda && <p className="fechas-ayuda profesor-ayuda">{ayuda}</p>}
      {catalogos[lista].map((a) => (
        <label key={a.id} className={`check-linea${form[lista].includes(a.id) ? ' activo' : ''}`}>
          <input type="checkbox" checked={form[lista].includes(a.id)} onChange={() => alternar(lista, a.id)} />
          {a.nombre}
        </label>
      ))}
    </fieldset>
  );

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = nombrePersona(form.nombre);
    const cedula = normalizarCedula(form.cedula);
    const lista: string[] = [];
    if (!nombre) lista.push('Escribe el nombre del profesor.');
    if (cedula.length < 5) lista.push('Escribe la cédula completa.');
    if (form.programas.length === 0) lista.push('Marca al menos un programa.');
    if (tieneSede(form) && form.agrupaciones.length === 0) lista.push('Marca al menos una agrupación de la sede.');
    if (tienePSB(form) && form.modulos.length === 0) lista.push('Marca al menos una escuela del Programa Simón Bolívar.');
    lista.push(...erroresHorario(form.horario));
    setErrores(lista);
    if (lista.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Lo que no corresponde a sus programas no se guarda.
    const profesor: Profesor = {
      ...form,
      nombre,
      cedula,
      agrupaciones: tieneSede(form) ? form.agrupaciones : [],
      modulos: tienePSB(form) ? form.modulos : [],
      horario: ordenarHorario(form.horario),
    };
    setGuardando(true);
    try {
      const p = await guardarProfesor(clave, profesor, inicial?.cedula);
      await queryClient.invalidateQueries({ queryKey: ['admin-profesores'] });
      setGuardado(p);
      setRecienRegistrado(!inicial);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Si es nuevo o cambió la cédula, la dirección pasa a ser la de su perfil.
      if (p.cedula !== inicial?.cedula) {
        navigate(`/admin/profesores/${p.cedula}`, { replace: true, state: { guardado: p, nuevo: !inicial } });
      }
    } catch (err) {
      setErrores([err instanceof Error ? err.message : 'No se pudo guardar.']);
    } finally {
      setGuardando(false);
    }
  };

  const resumen = horarioPorDia(form.horario.filter((b) => b.horaInicio && b.horaFin));

  return (
    <div className="admin-dashboard">
      <div className="admin-edit-header">
        <div>
          <Link to="/admin/profesores" className="admin-back-link">
            ← Volver a profesores
          </Link>
          <h2>{inicial ? inicial.nombre : 'Registrar profesor'}</h2>
          {inicial && <p className="fechas-ayuda">Perfil del profesor: lo que cambies aquí lo verá al entrar.</p>}
        </div>
      </div>

      {guardado && (
        <div className="alert-success profesor-guardado">
          <p>
            Listo: el perfil de <strong>{guardado.nombre}</strong> quedó guardado.
            {recienRegistrado && ' Ya puede entrar con su cédula.'}
          </p>
          <a
            className="btn btn-primary"
            href={enlaceWhatsApp('', mensajeAcceso(guardado, catalogo))}
            target="_blank"
            rel="noreferrer"
          >
            Avisarle por WhatsApp
          </a>
        </div>
      )}

      {errores.length > 0 && (
        <div className="alert-error" role="alert">
          <strong>Revisa:</strong>
          <ul>
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <form className="constancia-form profesor-form" onSubmit={guardar} noValidate>
        <section>
          <h3>Datos</h3>
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
              <p className="fechas-ayuda">Es con lo que entra al sitio.</p>
            </div>
          </div>
        </section>

        <section>
          <h3>Programas y agrupaciones</h3>
          {casillas('programas', 'Programas en los que está', 'Puede estar en varios.')}
          {tieneSede(form) && casillas('agrupaciones', 'Agrupaciones de la sede que lleva', 'Para los reportes de ensayo.')}
          {tienePSB(form) &&
            casillas('modulos', 'Escuelas del Programa Simón Bolívar', 'Solo podrá hacer informes de estas escuelas.')}
        </section>

        <section>
          <h3>Horario semanal</h3>
          <p className="fechas-ayuda">
            Marca mañana o tarde en cada día que trabaja. Si su horario es otro, usa «+ Otro horario».
          </p>
          <HorarioEditor value={form.horario} onChange={(horario) => setForm({ ...form, horario })} />
          {resumen.length > 0 && (
            <div className="aviso-info horario-resumen">
              <strong>Queda así:</strong>
              <ul>
                {resumen.map((d) => (
                  <li key={d.dia}>
                    {d.dia}: {d.texto}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <button type="submit" className="btn btn-primary btn-bloque" disabled={guardando}>
          {guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Registrar profesor'}
        </button>
      </form>
    </div>
  );
}
