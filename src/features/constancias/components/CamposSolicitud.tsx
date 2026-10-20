import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { AGRUPACIONES } from '../../../lib/datosEstaticos';
import { hoyIso } from '../lib/textoConstancia';
import {
  DIAS_SEMANA,
  FILA_HORARIO_VACIA,
  TIPOS_CONSTANCIA,
  type DatosSolicitud,
} from '../types/constancia.types';

export const AGRUPACION_OTRA = 'OTRA';

interface Props {
  form: UseFormReturn<DatosSolicitud>;
  /** La coordinación ve y puede ajustar el nombre de la agrupación tal cual se imprime. */
  modo: 'representante' | 'coordinacion';
}

const minDigitos = (n: number, mensaje: string) => (v: string) =>
  v.replace(/\D/g, '').length >= n || mensaje;

function MensajeError({ mensaje }: { mensaje?: string }) {
  return mensaje ? <p className="error">{mensaje}</p> : null;
}

export function CamposSolicitud({ form, modo }: Props) {
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;
  const tipo = watch('tipo');
  const agrupacionId = watch('agrupacionId');
  const fechaInicio = watch('fecha');
  const horario = useFieldArray({
    control,
    name: 'horario',
    rules: { validate: (filas) => tipo !== 'horario' || filas.length > 0 || 'Agrega al menos un día' },
  });

  const elegirAgrupacion = (id: string) => {
    const agr = AGRUPACIONES.find((a) => a.id === id);
    setValue('agrupacionNombre', agr ? agr.nombre : '', { shouldValidate: !!agr });
  };

  return (
    <>
      <section>
        <h3>¿Qué constancia necesitas?</h3>
        <div className="tipos-grid" role="radiogroup">
          {TIPOS_CONSTANCIA.map((t) => (
            <label key={t.id} className={`tipo-card ${tipo === t.id ? 'activo' : ''}`}>
              <input type="radio" value={t.id} {...register('tipo')} />
              <span className="tipo-card-titulo">{t.titulo}</span>
              <span className="tipo-card-desc">{t.descripcion}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3>Datos del estudiante</h3>
        <div className="campos-grid">
          <div className="campo-ancho">
            <label htmlFor="estudianteNombre">Nombres y apellidos *</label>
            <input
              id="estudianteNombre"
              type="text"
              placeholder="Ej: Esneyder Javier Zambrano Espinoza"
              {...register('estudianteNombre', { required: 'Escribe el nombre completo' })}
            />
            <MensajeError mensaje={errors.estudianteNombre?.message} />
          </div>

          <div>
            <label htmlFor="estudianteGenero">Sexo *</label>
            <select id="estudianteGenero" {...register('estudianteGenero')}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>

          <div>
            <label htmlFor="estudianteFechaNacimiento">Fecha de nacimiento *</label>
            <input
              id="estudianteFechaNacimiento"
              type="date"
              max={hoyIso()}
              {...register('estudianteFechaNacimiento', { required: 'Indica la fecha de nacimiento' })}
            />
            <MensajeError mensaje={errors.estudianteFechaNacimiento?.message} />
          </div>

          <div>
            <label htmlFor="estudianteCedula">Cédula del estudiante</label>
            <input
              id="estudianteCedula"
              type="text"
              inputMode="numeric"
              placeholder="V-34.099.176 (vacío si no posee)"
              {...register('estudianteCedula')}
            />
          </div>

          <div>
            <label htmlFor="agrupacionId">Agrupación *</label>
            <select
              id="agrupacionId"
              {...register('agrupacionId', {
                required: 'Selecciona la agrupación',
                onChange: (e) => elegirAgrupacion(e.target.value),
              })}
            >
              <option value="">Selecciona…</option>
              {AGRUPACIONES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
              <option value={AGRUPACION_OTRA}>Otra…</option>
            </select>
            <MensajeError mensaje={errors.agrupacionId?.message} />
          </div>

          {(modo === 'coordinacion' || agrupacionId === AGRUPACION_OTRA) && (
            <div className="campo-ancho">
              <label htmlFor="agrupacionNombre">
                {modo === 'coordinacion' ? 'Agrupación (como aparece en la constancia) *' : '¿Cuál agrupación? *'}
              </label>
              <input
                id="agrupacionNombre"
                type="text"
                placeholder="Ej: Orquesta Regional Alma Llanera Táchira"
                {...register('agrupacionNombre', { required: 'Escribe el nombre de la agrupación' })}
              />
              <MensajeError mensaje={errors.agrupacionNombre?.message} />
            </div>
          )}

          <div>
            <label htmlFor="instrumento">Fila o instrumento</label>
            <input
              id="instrumento"
              type="text"
              placeholder="Ej: Mandolinas, Violines, Cuatro"
              {...register('instrumento')}
            />
          </div>
        </div>
      </section>

      <section>
        {tipo === 'horario' && (
          <>
            <h3>Horario</h3>
            <p className="fechas-ayuda">Agrega cada día en que el estudiante asiste.</p>
            <div className="horario-filas">
              {horario.fields.map((fila, i) => (
                <div key={fila.id} className="horario-fila">
                  <select aria-label="Día" {...register(`horario.${i}.dia`)}>
                    {DIAS_SEMANA.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    aria-label="Hora de inicio"
                    {...register(`horario.${i}.horaInicio`, { required: true })}
                  />
                  <input
                    type="time"
                    aria-label="Hora de fin"
                    {...register(`horario.${i}.horaFin`, { required: true })}
                  />
                  <input
                    type="text"
                    aria-label="Actividad"
                    placeholder="Ensayo General"
                    {...register(`horario.${i}.actividad`, { required: true })}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => horario.remove(i)}
                    aria-label={`Quitar ${fila.dia}`}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
            {errors.horario && <MensajeError mensaje="Completa día, horas y actividad de cada fila" />}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => horario.append({ ...FILA_HORARIO_VACIA, dia: 'Miércoles' })}
            >
              + Agregar día
            </button>
          </>
        )}

        {tipo === 'pertenencia' && (
          <>
            <h3>Participación</h3>
            <div className="campos-grid">
              <div>
                <label htmlFor="fechaIngreso">¿Desde cuándo pertenece? (opcional)</label>
                <input id="fechaIngreso" type="date" max={hoyIso()} {...register('fechaIngreso')} />
              </div>
            </div>
          </>
        )}

        {(tipo === 'concierto' || tipo === 'jornada' || tipo === 'ensayo') && (
          <>
            <h3>
              {tipo === 'concierto' ? 'Concierto' : tipo === 'jornada' ? 'Jornada de ensayos' : 'Ensayo'}
            </h3>
            <div className="campos-grid">
              {tipo !== 'ensayo' && (
                <div className="campo-ancho">
                  <label htmlFor="eventoNombre">
                    Nombre {tipo === 'concierto' ? 'del concierto' : 'de la jornada'} (opcional)
                  </label>
                  <input
                    id="eventoNombre"
                    type="text"
                    placeholder={tipo === 'concierto' ? 'Ej: Concierto de Navidad' : 'Ej: Intensivo de vacaciones'}
                    {...register('eventoNombre')}
                  />
                </div>
              )}

              <div>
                <label htmlFor="fecha">{tipo === 'jornada' ? 'Desde *' : 'Fecha *'}</label>
                <input id="fecha" type="date" {...register('fecha', { required: 'Indica la fecha' })} />
                <MensajeError mensaje={errors.fecha?.message} />
              </div>

              {tipo === 'jornada' && (
                <div>
                  <label htmlFor="fechaFin">Hasta *</label>
                  <input
                    id="fechaFin"
                    type="date"
                    min={fechaInicio || undefined}
                    {...register('fechaFin', {
                      required: 'Indica la fecha final',
                      validate: (v) => !fechaInicio || v >= fechaInicio || 'Debe ser igual o posterior al inicio',
                    })}
                  />
                  <MensajeError mensaje={errors.fechaFin?.message} />
                </div>
              )}

              <div>
                <label htmlFor="horaInicio">Hora de inicio</label>
                <input id="horaInicio" type="time" {...register('horaInicio')} />
              </div>

              <div>
                <label htmlFor="horaFin">Hora de fin</label>
                <input id="horaFin" type="time" {...register('horaFin')} />
              </div>

              <div className="campo-ancho">
                <label htmlFor="lugar">Lugar *</label>
                <input
                  id="lugar"
                  type="text"
                  placeholder="Ej: el Teatro Municipal de Palmira"
                  {...register('lugar', { required: 'Indica el lugar' })}
                />
                <MensajeError mensaje={errors.lugar?.message} />
              </div>
            </div>
          </>
        )}
      </section>

      <section>
        <h3>¿Para quién es la constancia?</h3>
        <div className="campos-grid">
          <div className="campo-ancho">
            <label htmlFor="destinatario">Institución o persona a quien va dirigida</label>
            <input
              id="destinatario"
              type="text"
              placeholder="Ej: Liceo Monseñor Antonio Ignacio Camargo Álvarez"
              {...register('destinatario')}
            />
            <p className="fechas-ayuda">Si lo dejas vacío dirá «A quien pueda interesar».</p>
          </div>

          <div>
            <label htmlFor="escolaridadSituacion">Estudios (opcional)</label>
            <select id="escolaridadSituacion" {...register('escolaridadSituacion')}>
              <option value="cursa">Cursa actualmente</option>
              <option value="proximo">Próximo a cursar</option>
            </select>
          </div>

          <div>
            <label htmlFor="escolaridadGrado">Grado o año</label>
            <input
              id="escolaridadGrado"
              type="text"
              placeholder="Ej: 5to año de educación media general"
              {...register('escolaridadGrado')}
            />
          </div>

          <div>
            <label htmlFor="escolaridadAnioLectivo">Año escolar</label>
            <input
              id="escolaridadAnioLectivo"
              type="text"
              placeholder="Ej: 2026-2027"
              {...register('escolaridadAnioLectivo')}
            />
          </div>
        </div>
      </section>

      <section>
        <h3>Datos del representante</h3>
        <div className="campos-grid">
          <div className="campo-ancho">
            <label htmlFor="representanteNombre">Nombres y apellidos *</label>
            <input
              id="representanteNombre"
              type="text"
              {...register('representanteNombre', { required: 'Escribe tu nombre' })}
            />
            <MensajeError mensaje={errors.representanteNombre?.message} />
          </div>

          <div>
            <label htmlFor="representanteCedula">Cédula *</label>
            <input
              id="representanteCedula"
              type="text"
              inputMode="numeric"
              placeholder="V-12.345.678"
              {...register('representanteCedula', {
                required: 'Escribe tu cédula',
                validate: minDigitos(6, 'Cédula inválida'),
              })}
            />
            <MensajeError mensaje={errors.representanteCedula?.message} />
          </div>

          <div>
            <label htmlFor="representanteTelefono">Teléfono (WhatsApp) *</label>
            <input
              id="representanteTelefono"
              type="tel"
              inputMode="tel"
              placeholder="0414-1234567"
              {...register('representanteTelefono', {
                required: 'Escribe un teléfono',
                validate: minDigitos(10, 'Teléfono inválido'),
              })}
            />
            <MensajeError mensaje={errors.representanteTelefono?.message} />
          </div>

          <div className="campo-ancho">
            <label htmlFor="notas">Nota para la coordinación (no sale en la constancia)</label>
            <textarea id="notas" placeholder="Opcional" {...register('notas')} />
          </div>
        </div>
      </section>
    </>
  );
}
