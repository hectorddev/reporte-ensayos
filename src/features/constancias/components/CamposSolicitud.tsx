import { useEffect, useState } from 'react';
import { Controller, useFieldArray, type RegisterOptions, type UseFormReturn } from 'react-hook-form';
import { useCatalogoAgrupaciones } from '../../../lib/agrupaciones';
import { CampoFecha } from './CampoFecha';
import { CampoHora } from './CampoHora';
import { ResumenPlantilla } from './ResumenPlantilla';
import { diaCorto, diasEntre, esMenorDeEdad, esVariosDias, hoyIso, nombrePersona } from '../lib/textoConstancia';
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

type CampoDeFecha = 'estudianteFechaNacimiento' | 'fechaIngreso' | 'fecha' | 'fechaFin';

interface PropsFecha {
  form: Form;
  name: CampoDeFecha;
  rules?: RegisterOptions<DatosSolicitud, CampoDeFecha>;
  min?: string;
  max?: string;
}

/** Campo de fecha DD/MM/AAAA conectado al formulario (guarda AAAA-MM-DD). */
function FechaControlada({ form, name, rules, min, max }: PropsFecha) {
  return (
    <Controller
      control={form.control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <CampoFecha id={name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} min={min} max={max} />
      )}
    />
  );
}

type CampoDeHora =
  | 'horaInicio'
  | 'horaFin'
  | `horario.${number}.horaInicio`
  | `horario.${number}.horaFin`
  | `horarioDias.${number}.horaInicio`
  | `horarioDias.${number}.horaFin`;

interface PropsHora {
  form: Form;
  name: CampoDeHora;
  id: string;
  etiqueta?: string;
  rules?: RegisterOptions<DatosSolicitud, CampoDeHora>;
}

/** Hora con am/pm conectada al formulario (guarda HH:MM en 24 horas). */
function HoraControlada({ form, name, id, etiqueta, rules }: PropsHora) {
  return (
    <Controller
      control={form.control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <CampoHora id={id} value={field.value} onChange={field.onChange} onBlur={field.onBlur} etiqueta={etiqueta} />
      )}
    />
  );
}

/** Una hora de fin antes que la de inicio casi siempre es am/pm cambiado. */
const finDespuesDeInicio = (inicio: string) => (fin: string) =>
  !fin || !inicio || fin > inicio || 'La hora de fin debe ser después de la de inicio. Revisa am / pm.';

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
      {plantilla ? (
        <ResumenPlantilla plantilla={plantilla} />
      ) : (
        <SeccionTipo form={form} titulo={modo === 'coordinacion' ? 'Tipo de constancia' : undefined} />
      )}
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
            {tipo === t.id && <span className="tipo-card-marca">✓ Elegida</span>}
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
  const { data: catalogo } = useCatalogoAgrupaciones();
  // Las inactivas no se ofrecen, salvo la que ya estaba elegida (al revisar una solicitud vieja).
  const opciones = catalogo.filter((a) => a.activa || a.id === agrupacionId);

  const elegir = (id: string) => {
    const agr = catalogo.find((a) => a.id === id);
    setValue('agrupacionNombre', agr ? agr.nombre : '', { shouldValidate: !!agr });
  };

  return (
    <>
      <div>
        <label htmlFor="agrupacionId">Agrupación{opcional ? ' (opcional)' : ''}</label>
        <select
          id="agrupacionId"
          {...register('agrupacionId', {
            required: opcional ? false : 'Selecciona la agrupación',
            onChange: (e) => elegir(e.target.value),
          })}
        >
          <option value="">{opcional ? 'Cualquiera (la elige quien solicita)' : 'Selecciona…'}</option>
          {opciones.map((a) => (
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
            {modo === 'coordinacion' ? 'Agrupación (como aparece en la constancia)' : '¿Cuál agrupación?'}
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
    watch,
    setValue,
    formState: { errors },
  } = form;
  const genero = watch('estudianteGenero');
  return (
    <section>
      <h3>Datos del estudiante</h3>
      <div className="campos-grid">
        <div className="campo-ancho">
          <label htmlFor="estudianteNombre">Nombres y apellidos</label>
          <input
            id="estudianteNombre"
            type="text"
            placeholder="Ej: María José Pérez Gómez"
            {...register('estudianteNombre', {
              required: 'Escribe el nombre completo',
              // Al salir del campo: «DAVIANA MÁRQUEZ» → «Daviana Márquez», para que se vea cómo queda.
              onBlur: (e) => setValue('estudianteNombre', nombrePersona(e.target.value)),
            })}
          />
          <p className="fechas-ayuda">Tal como aparece en la cédula o partida de nacimiento: así saldrá en la constancia.</p>
          <MensajeError mensaje={errors.estudianteNombre?.message} />
        </div>

        <div>
          <fieldset className="opciones-botones">
            <legend>Sexo</legend>
            {(
              [
                ['M', 'Masculino'],
                ['F', 'Femenino'],
              ] as const
            ).map(([valor, texto]) => (
              <label key={valor} className={genero === valor ? 'activo' : ''}>
                <input
                  type="radio"
                  value={valor}
                  {...register('estudianteGenero', { required: 'Indica el sexo del estudiante' })}
                />
                {texto}
              </label>
            ))}
          </fieldset>
          <MensajeError mensaje={errors.estudianteGenero?.message} />
        </div>

        <div>
          <label htmlFor="estudianteFechaNacimiento">Fecha de nacimiento</label>
          <FechaControlada
            form={form}
            name="estudianteFechaNacimiento"
            max={hoyIso()}
            rules={{
              required: 'Indica la fecha de nacimiento',
              validate: (v) => v <= hoyIso() || 'La fecha de nacimiento no puede ser futura',
            }}
          />
          <p className="fechas-ayuda">Día, mes y año. Ej: 25/03/2012</p>
          <MensajeError mensaje={errors.estudianteFechaNacimiento?.message} />
        </div>

        <div>
          <label htmlFor="estudianteCedula">Cédula del estudiante (opcional)</label>
          <input
            id="estudianteCedula"
            type="text"
            inputMode="numeric"
            placeholder="V-30.123.456"
            {...register('estudianteCedula')}
          />
          <p className="fechas-ayuda">Si no tiene cédula, déjalo vacío.</p>
        </div>

        {!agrupacionFija && <CampoAgrupacion form={form} modo={modo} />}

        <div>
          <label htmlFor="instrumento">Instrumento o fila (opcional)</label>
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
    setValue,
    clearErrors,
    formState: { errors },
  } = form;
  const tipo = watch('tipo');
  const fechaInicio = watch('fecha');
  const fechaFin = watch('fechaFin');
  // Mientras no se elija: la jornada suele ser de varios días; lo demás, de uno
  // (o varios si ya trae último día, p. ej. al editar una plantilla).
  const [duracionElegida, setDuracionElegida] = useState<boolean | null>(null);
  const variosDias = duracionElegida ?? (tipo === 'jornada' || !!fechaFin);
  const elegirDuracion = (varios: boolean) => {
    setDuracionElegida(varios);
    if (!varios) {
      setValue('fechaFin', '');
      clearErrors('fechaFin');
      // Si tenía horas por día, las del primer día pasan a ser las del único día.
      const [primero] = form.getValues('horarioDias') ?? [];
      if (primero) {
        setValue('horaInicio', primero.horaInicio);
        setValue('horaFin', primero.horaFin);
      }
      setValue('horarioDias', []);
    }
  };
  const horario = useFieldArray({
    control,
    name: 'horario',
    rules: { validate: (filas) => tipo !== 'horario' || filas.length > 0 || 'Agrega al menos un día' },
  });
  const filasIncompletas =
    Array.isArray(errors.horario) &&
    errors.horario.some((f) => f && (f.dia || f.horaInicio || f.actividad || f.horaFin?.type === 'required'));

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
                <label className="horario-celda">
                  <span>Día</span>
                  <select {...register(`horario.${i}.dia`)}>
                    {DIAS_SEMANA.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="horario-celda">
                  <span>Desde</span>
                  <HoraControlada
                    form={form}
                    name={`horario.${i}.horaInicio`}
                    id={`horario-${i}-inicio`}
                    etiqueta={`${fila.dia}, desde`}
                    rules={{ required: true, deps: [`horario.${i}.horaFin`] }}
                  />
                </div>
                <div className="horario-celda">
                  <span>Hasta</span>
                  <HoraControlada
                    form={form}
                    name={`horario.${i}.horaFin`}
                    id={`horario-${i}-fin`}
                    etiqueta={`${fila.dia}, hasta`}
                    rules={{
                      required: true,
                      validate: (v) => finDespuesDeInicio(form.getValues(`horario.${i}.horaInicio`))(v),
                    }}
                  />
                  <MensajeError mensaje={errors.horario?.[i]?.horaFin?.message} />
                </div>
                <label className="horario-celda">
                  <span>Actividad</span>
                  <input
                    type="text"
                    placeholder="Ensayo General"
                    {...register(`horario.${i}.actividad`, { required: true })}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-peligro-suave btn-sm horario-quitar"
                  onClick={() => horario.remove(i)}
                  aria-label={`Quitar ${fila.dia}`}
                >
                  Quitar día
                </button>
              </div>
            ))}
          </div>
          {/* «Hasta antes que desde» ya se avisa en su fila; aquí, solo lo que falta llenar. */}
          {errors.horario?.root && <MensajeError mensaje={errors.horario.root.message} />}
          {filasIncompletas && <MensajeError mensaje="Completa día, horas y actividad de cada fila" />}
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
              <FechaControlada
                form={form}
                name="fechaIngreso"
                max={hoyIso()}
                rules={{ validate: (v) => !v || v <= hoyIso() || 'No puede ser una fecha futura' }}
              />
              <MensajeError mensaje={errors.fechaIngreso?.message} />
            </div>
          </div>
        </>
      )}

      {(tipo === 'concierto' || tipo === 'jornada' || tipo === 'ensayo') && (
        <>
          <h3>{tipo === 'concierto' ? 'Concierto o encuentro' : tipo === 'jornada' ? 'Jornada de ensayos' : 'Ensayo'}</h3>
          <div className="campos-grid">
            <div className="campo-ancho">
              <label htmlFor="eventoNombre">
                Nombre {tipo === 'concierto' ? 'del concierto o encuentro' : tipo === 'jornada' ? 'de la jornada' : 'del ensayo'} (opcional)
              </label>
              <input
                id="eventoNombre"
                type="text"
                placeholder={
                  tipo === 'concierto'
                    ? 'Ej: Encuentro Regional de Orquestas'
                    : tipo === 'jornada'
                      ? 'Ej: Intensivo de vacaciones'
                      : 'Ej: Ensayo general de vientos metal'
                }
                {...register('eventoNombre')}
              />
            </div>

            <div className="campo-ancho">
              <fieldset className="opciones-botones opciones-duracion">
                <legend>¿Cuántos días dura?</legend>
                {(
                  [
                    [false, 'Un solo día'],
                    [true, 'Varios días'],
                  ] as const
                ).map(([valor, texto]) => (
                  <label key={texto} className={variosDias === valor ? 'activo' : ''}>
                    <input type="radio" name="duracion" checked={variosDias === valor} onChange={() => elegirDuracion(valor)} />
                    {texto}
                  </label>
                ))}
              </fieldset>
              {variosDias && (
                <p className="fechas-ayuda">
                  Indica el primer y el último día. La constancia dirá, por ejemplo: «del viernes 13 al domingo 15 de
                  noviembre».
                </p>
              )}
            </div>

            <div>
              <label htmlFor="fecha">{variosDias ? 'Primer día' : 'Fecha'}</label>
              <FechaControlada
                form={form}
                name="fecha"
                rules={{ required: variosDias ? 'Indica el primer día' : 'Indica la fecha', deps: ['fechaFin'] }}
              />
              <MensajeError mensaje={errors.fecha?.message} />
            </div>

            {variosDias && (
              <div>
                <label htmlFor="fechaFin">Último día</label>
                <FechaControlada
                  form={form}
                  name="fechaFin"
                  min={fechaInicio || undefined}
                  rules={{
                    required: 'Indica el último día',
                    validate: (v) =>
                      !fechaInicio || v > fechaInicio || 'El último día debe ser después del primero. Si es un solo día, elige «Un solo día».',
                  }}
                />
                <MensajeError mensaje={errors.fechaFin?.message} />
              </div>
            )}

            {/* Al cambiar entre uno y varios días se vuelve a preguntar por el horario. */}
            <HorasEvento key={String(variosDias)} form={form} variosDias={variosDias} />

            <div className="campo-ancho">
              <label htmlFor="lugar">Lugar</label>
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

/**
 * Horas de la actividad: unas para todos los días o, si dura varios días y
 * cambian, una fila por fecha (se arman solas a partir del primer y último día).
 */
function HorasEvento({ form, variosDias }: { form: Form; variosDias: boolean }) {
  const {
    control,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = form;
  const fechaInicio = watch('fecha');
  const fechaFin = watch('fechaFin');
  const { fields, replace } = useFieldArray({ control, name: 'horarioDias' });
  const [porDiaElegido, setPorDiaElegido] = useState<boolean | null>(null);
  const fechas = variosDias ? diasEntre(fechaInicio, fechaFin) : [];
  // Rango válido pero de más de un mes: no se ofrecen horas por día.
  const muyLargo = variosDias && esVariosDias({ fecha: fechaInicio, fechaFin }) && !fechas.length;
  const porDia = variosDias && !muyLargo && (porDiaElegido ?? fields.length > 0);
  const claveFechas = fechas.join(',');

  // Si cambian el primer o el último día, se agregan o quitan filas y se
  // conservan las horas ya escritas.
  useEffect(() => {
    if (!porDia || !claveFechas) return;
    const actuales = getValues('horarioDias') ?? [];
    if (actuales.map((a) => a.fecha).join(',') === claveFechas) return;
    replace(
      claveFechas.split(',').map((fecha) => actuales.find((a) => a.fecha === fecha) ?? { fecha, horaInicio: '', horaFin: '' })
    );
  }, [porDia, claveFechas, getValues, replace]);

  const elegirPorDia = (si: boolean) => {
    setPorDiaElegido(si);
    if (si) {
      // Se parte de las horas que ya tenía: basta con cambiar el día distinto.
      const horaInicio = getValues('horaInicio');
      const horaFin = getValues('horaFin');
      replace(fechas.map((fecha) => ({ fecha, horaInicio, horaFin })));
      setValue('horaInicio', '');
      setValue('horaFin', '');
    } else {
      const [primero] = getValues('horarioDias') ?? [];
      if (primero) {
        setValue('horaInicio', primero.horaInicio);
        setValue('horaFin', primero.horaFin);
      }
      replace([]);
    }
  };

  return (
    <>
      {variosDias && !muyLargo && (
        <div className="campo-ancho">
          <fieldset className="opciones-botones opciones-duracion">
            <legend>¿El horario es igual todos los días?</legend>
            {(
              [
                [false, 'Sí, igual'],
                [true, 'No, cambia'],
              ] as const
            ).map(([valor, texto]) => (
              <label key={texto} className={porDia === valor ? 'activo' : ''}>
                <input type="radio" name="horarioPorDia" checked={porDia === valor} onChange={() => elegirPorDia(valor)} />
                {texto}
              </label>
            ))}
          </fieldset>
        </div>
      )}

      {porDia ? (
        <div className="campo-ancho">
          {fields.length ? (
            <>
              <p className="fechas-ayuda">Indica la hora de inicio y de fin de cada día.</p>
              <div className="horario-filas">
                {fields.map((fila, i) => (
                  <div key={fila.id} className="horario-fila horario-fila-dia">
                    <strong className="horario-celda horario-celda-fecha">{diaCorto(fila.fecha)}</strong>
                    <div className="horario-celda">
                      <span>Desde</span>
                      <HoraControlada
                        form={form}
                        name={`horarioDias.${i}.horaInicio`}
                        id={`dia-${i}-inicio`}
                        etiqueta={`${diaCorto(fila.fecha)}, desde`}
                        rules={{ required: 'Falta la hora de inicio', deps: [`horarioDias.${i}.horaFin`] }}
                      />
                      <MensajeError mensaje={errors.horarioDias?.[i]?.horaInicio?.message} />
                    </div>
                    <div className="horario-celda">
                      <span>Hasta</span>
                      <HoraControlada
                        form={form}
                        name={`horarioDias.${i}.horaFin`}
                        id={`dia-${i}-fin`}
                        etiqueta={`${diaCorto(fila.fecha)}, hasta`}
                        rules={{
                          required: 'Falta la hora de fin',
                          validate: (v) => finDespuesDeInicio(getValues(`horarioDias.${i}.horaInicio`))(v),
                        }}
                      />
                      <MensajeError mensaje={errors.horarioDias?.[i]?.horaFin?.message} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="fechas-ayuda">Primero indica el primer y el último día: aquí aparecerá cada día.</p>
          )}
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="horaInicio">Hora de inicio{variosDias ? ' de cada día' : ''} (opcional)</label>
            <HoraControlada form={form} name="horaInicio" id="horaInicio" etiqueta="Hora de inicio" rules={{ deps: ['horaFin'] }} />
          </div>

          <div>
            <label htmlFor="horaFin">Hora de fin{variosDias ? ' de cada día' : ''} (opcional)</label>
            <HoraControlada
              form={form}
              name="horaFin"
              id="horaFin"
              etiqueta="Hora de fin"
              rules={{ validate: (v) => finDespuesDeInicio(getValues('horaInicio'))(v) }}
            />
            <MensajeError mensaje={errors.horaFin?.message} />
          </div>
        </>
      )}
    </>
  );
}

function SeccionDestinatario({ form }: { form: Form }) {
  return (
    <section>
      <h3>¿Para quién es la constancia?</h3>
      <div className="campos-grid">
        <div className="campo-ancho">
          <label htmlFor="destinatario">Institución o persona a quien va dirigida (opcional)</label>
          <input
            id="destinatario"
            type="text"
            placeholder="Ej: el liceo o colegio donde estudia"
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
    setValue,
    formState: { errors },
  } = form;
  const nacimiento = watch('estudianteFechaNacimiento');
  const menor = esMenorDeEdad(nacimiento);

  return (
    <section>
      {menor ? (
        <>
          <h3>Datos del representante</h3>
          <p className="fechas-ayuda">
            {nacimiento
              ? 'El estudiante es menor de edad: escribe los datos de su representante (madre, padre o responsable).'
              : 'Si el estudiante es menor de edad, escribe los datos de su representante (madre, padre o responsable).'}
          </p>
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
              <label htmlFor="representanteNombre">Nombres y apellidos del representante</label>
              <input
                id="representanteNombre"
                type="text"
                {...register('representanteNombre', {
                  required: 'Escribe el nombre del representante',
                  onBlur: (e) => setValue('representanteNombre', nombrePersona(e.target.value)),
                })}
              />
              <MensajeError mensaje={errors.representanteNombre?.message} />
            </div>

            <div>
              <label htmlFor="representanteCedula">Cédula del representante</label>
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
          <label htmlFor="representanteTelefono">Teléfono con WhatsApp</label>
          <input
            id="representanteTelefono"
            type="tel"
            inputMode="tel"
            placeholder="0414-1234567"
            {...register('representanteTelefono', {
              required: 'Escribe un teléfono',
              validate: minDigitos(10, 'Revisa el teléfono. Ej: 0414-1234567'),
            })}
          />
          <p className="fechas-ayuda">A este número te avisaremos cuando la constancia esté lista.</p>
          <MensajeError mensaje={errors.representanteTelefono?.message} />
        </div>

        <div className="campo-ancho">
          <label htmlFor="notas">Nota para la coordinación (opcional)</label>
          <textarea id="notas" {...register('notas')} />
          <p className="fechas-ayuda">No sale en la constancia.</p>
        </div>
      </div>
    </section>
  );
}
