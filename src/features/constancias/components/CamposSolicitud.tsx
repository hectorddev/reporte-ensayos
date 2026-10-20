import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { AGRUPACIONES } from '../../../lib/datosEstaticos';
import { ResumenPlantilla } from './ResumenPlantilla';
import { esMenorDeEdad, hoyIso } from '../lib/textoConstancia';
import {
  DIAS_SEMANA,
  FILA_HORARIO_VACIA,
  TIPOS_CONSTANCIA,
  type DatosSolicitud,
  type Plantilla,
} from '../types/constancia.types';

export const AGRUPACION_OTRA = 'OTRA';

type Form = UseFormReturn<DatosSolicitud>;
/** coordinacion ve y puede ajustar el nombre de la agrupación tal cual se imprime. */
type Modo = 'representante' | 'coordinacion';

const minDigitos = (n: number, mensaje: string) => (v: string) =>
  v.replace(/\D/g, '').length >= n || mensaje;

function MensajeError({ mensaje }: { mensaje?: string }) {
  return mensaje ? <p className="error">{mensaje}</p> : null;
}

interface Props {
  form: Form;
  modo: Modo;
  /** Con plantilla, tipo/fechas/horas/lugar (y la agrupación si la fijó) no se piden. */
  plantilla?: Plantilla | null;
}

/** Formulario completo de solicitud (representante) o de revisión (coordinación). */
export function CamposSolicitud({ form, modo, plantilla }: Props) {
  return (
    <>
      {plantilla ? <ResumenPlantilla plantilla={plantilla} /> : <SeccionTipo form={form} />}
      <SeccionEstudiante form={form} modo={modo} agrupacionFija={!!plantilla?.datos.agrupacionId} />
      {(!plantilla || plantilla.datos.tipo === 'pertenencia') && <SeccionDetalle form={form} uso="solicitud" />}
      <SeccionDestinatario form={form} />
      <SeccionContacto form={form} />
    </>
  );
}

export function SeccionTipo({ form, titulo = '¿Qué constancia necesitas?' }: { form: Form; titulo?: string }) {
  const tipo = form.watch('tipo');
  return (
    <section>
      <h3>{titulo}</h3>
      <div className="tipos-grid" role="radiogroup">
        {TIPOS_CONSTANCIA.map((t) => (
          <label key={t.id} className={`tipo-card ${tipo === t.id ? 'activo' : ''}`}>
            <input type="radio" value={t.id} {...form.register('tipo')} />
            <span className="tipo-card-titulo">{t.titulo}</span>
            <span className="tipo-card-desc">{t.descripcion}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

interface PropsAgrupacion {
  form: Form;
  modo: Modo;
  /** En una plantilla la agrupación es opcional: vacía = la elige quien solicita. */
  opcional?: boolean;
}

export function CampoAgrupacion({ form, modo, opcional = false }: PropsAgrupacion) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const agrupacionId = watch('agrupacionId');
  const verNombre = agrupacionId === AGRUPACION_OTRA || (modo === 'coordinacion' && !!agrupacionId);

  const elegir = (id: string) => {
    const agr = AGRUPACIONES.find((a) => a.id === id);
    setValue('agrupacionNombre', agr ? agr.nombre : '', { shouldValidate: !!agr });
  };

  return (
    <>
      <div>
        <label htmlFor="agrupacionId">Agrupación{opcional ? '' : ' *'}</label>
        <select
          id="agrupacionId"
          {...register('agrupacionId', {
            required: opcional ? false : 'Selecciona la agrupación',
            onChange: (e) => elegir(e.target.value),
          })}
        >
          <option value="">{opcional ? 'Cualquiera (la elige quien solicita)' : 'Selecciona…'}</option>
          {AGRUPACIONES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
          <option value={AGRUPACION_OTRA}>Otra…</option>
        </select>
        <MensajeError mensaje={errors.agrupacionId?.message} />
      </div>

      {verNombre && (
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
    </>
  );
}

function SeccionEstudiante({ form, modo, agrupacionFija }: { form: Form; modo: Modo; agrupacionFija: boolean }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
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

        {!agrupacionFija && <CampoAgrupacion form={form} modo={modo} />}

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
  );
}

interface PropsDetalle {
  form: Form;
  /** plantilla: la coordinación fija el evento; la fecha de ingreso es personal y no va. */
  uso: 'solicitud' | 'plantilla';
}

/** Lo propio de cada tipo: días del horario, fecha de ingreso o datos del evento. */
export function SeccionDetalle({ form, uso }: PropsDetalle) {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = form;
  const tipo = watch('tipo');
  const fechaInicio = watch('fecha');
  const horario = useFieldArray({
    control,
    name: 'horario',
    rules: { validate: (filas) => tipo !== 'horario' || filas.length > 0 || 'Agrega al menos un día' },
  });

  if (tipo === 'pertenencia' && uso === 'plantilla') return null;

  return (
    <section>
      {tipo === 'horario' && (
        <>
          <h3>Horario</h3>
          <p className="fechas-ayuda">
            {uso === 'plantilla' ? 'Agrega cada día de actividades de la agrupación.' : 'Agrega cada día en que el estudiante asiste.'}
          </p>
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
          <h3>{tipo === 'concierto' ? 'Concierto' : tipo === 'jornada' ? 'Jornada de ensayos' : 'Ensayo'}</h3>
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
  );
}

function SeccionDestinatario({ form }: { form: Form }) {
  return (
    <section>
      <h3>¿Para quién es la constancia?</h3>
      <div className="campos-grid">
        <div className="campo-ancho">
          <label htmlFor="destinatario">Institución o persona a quien va dirigida</label>
          <input
            id="destinatario"
            type="text"
            placeholder="Ej: Liceo Monseñor Antonio Ignacio Camargo Álvarez"
            {...form.register('destinatario')}
          />
          <p className="fechas-ayuda">Si lo dejas vacío dirá «A quien pueda interesar».</p>
        </div>
      </div>
    </section>
  );
}

/** Representante solo si el estudiante es menor de edad; el teléfono siempre. */
function SeccionContacto({ form }: { form: Form }) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const menor = esMenorDeEdad(watch('estudianteFechaNacimiento'));

  return (
    <section>
      {menor ? (
        <>
          <h3>Datos del representante</h3>
          <p className="fechas-ayuda">El estudiante es menor de edad: lo solicita su representante.</p>
        </>
      ) : (
        <>
          <h3>Datos de contacto</h3>
          <p className="fechas-ayuda">El estudiante es mayor de edad: no necesita representante.</p>
        </>
      )}
      <div className="campos-grid">
        {menor && (
          <>
            <div className="campo-ancho">
              <label htmlFor="representanteNombre">Nombres y apellidos del representante *</label>
              <input
                id="representanteNombre"
                type="text"
                {...register('representanteNombre', { required: 'Escribe el nombre del representante' })}
              />
              <MensajeError mensaje={errors.representanteNombre?.message} />
            </div>

            <div>
              <label htmlFor="representanteCedula">Cédula del representante *</label>
              <input
                id="representanteCedula"
                type="text"
                inputMode="numeric"
                placeholder="V-12.345.678"
                {...register('representanteCedula', {
                  required: 'Escribe la cédula del representante',
                  validate: minDigitos(6, 'Cédula inválida'),
                })}
              />
              <MensajeError mensaje={errors.representanteCedula?.message} />
            </div>
          </>
        )}

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
  );
}
