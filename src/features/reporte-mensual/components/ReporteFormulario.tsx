import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { AgrupacionSelector } from './AgrupacionSelector';
import { PeriodoSelector } from './PeriodoSelector';
import { FechasEnsayoPicker } from './FechasEnsayoPicker';
import { RepertorioInput } from './RepertorioInput';
import { MatriculaPanel } from './MatriculaPanel';
import { useAgrupaciones } from '../hooks/useAgrupaciones';
import {
  MATRICULA_VACIA,
  MESES,
  reporteToFormData,
  totalMatricula,
  type Agrupacion,
  type ReporteMensualFormData,
  type ReporteMensualGuardado,
} from '../types/reporteMensual.types';

interface Props {
  titulo: string;
  valoresIniciales?: ReporteMensualFormData;
  textoBoton: string;
  isSubmitting?: boolean;
  error?: Error | null;
  mensajeExito?: string | null;
  onSubmit: (data: ReporteMensualFormData) => Promise<void>;
  onExitoDismiss?: () => void;
  resetearAlCambiarPeriodo?: boolean;
  /** Solo estas agrupaciones (las del profesor); si es una, queda elegida. */
  agrupaciones?: Agrupacion[];
  /**
   * Reportes ya guardados: si el mes elegido ya tiene uno se carga para
   * corregirlo; si no, se copia la matrícula del último reporte anterior.
   */
  reportesPrevios?: ReporteMensualGuardado[];
}

type AvisoPrecarga = { tipo: 'existente' | 'matricula'; de: ReporteMensualGuardado } | null;

const periodo = (r: { anio: number; mes: number }) => r.anio * 12 + r.mes;

const valoresPorDefecto: ReporteMensualFormData = {
  agrupacionId: '',
  anio: new Date().getFullYear(),
  mes: new Date().getMonth() + 1,
  fechasEnsayos: [],
  temasRepertorio: [],
  matricula: MATRICULA_VACIA,
  observaciones: '',
};

export function ReporteFormulario({
  titulo,
  valoresIniciales,
  textoBoton,
  isSubmitting = false,
  error,
  mensajeExito,
  onSubmit,
  onExitoDismiss,
  resetearAlCambiarPeriodo = true,
  agrupaciones: agrupacionesPermitidas,
  reportesPrevios,
}: Props) {
  const unica = agrupacionesPermitidas?.length === 1 ? agrupacionesPermitidas[0].id : '';
  const iniciales = valoresIniciales ?? { ...valoresPorDefecto, agrupacionId: unica };
  const [anio, setAnio] = useState(iniciales.anio);
  const [mes, setMes] = useState(iniciales.mes);
  const [aviso, setAviso] = useState<AvisoPrecarga>(null);
  /** Periodo cuyo reporte guardado está cargado en el formulario. */
  const cargado = useRef<string | null>(null);
  /** Periodo al que ya se le copió la matrícula del mes anterior. */
  const copiada = useRef<string | null>(null);

  const { data: todas = [], isLoading: loadingAgr } = useAgrupaciones();
  const agrupaciones = agrupacionesPermitidas ?? todas;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ReporteMensualFormData>({
    defaultValues: iniciales,
  });

  const agrupacionId = watch('agrupacionId');

  useEffect(() => {
    if (valoresIniciales) {
      reset(valoresIniciales);
      setAnio(valoresIniciales.anio);
      setMes(valoresIniciales.mes);
    }
  }, [valoresIniciales, reset]);

  // Precarga según agrupación y mes (solo si se pasan los reportes guardados).
  useEffect(() => {
    if (!reportesPrevios || !agrupacionId) return;
    const clave = `${agrupacionId}|${anio}|${mes}`;
    const deLaAgrupacion = reportesPrevios.filter((r) => r.agrupacionId === agrupacionId);
    const existente = deLaAgrupacion.find((r) => r.anio === anio && r.mes === mes);
    if (existente) {
      if (cargado.current !== clave) {
        reset(reporteToFormData(existente));
        cargado.current = clave;
      }
      setAviso({ tipo: 'existente', de: existente });
      return;
    }
    if (cargado.current) {
      // Venía de un reporte ya guardado: el mes nuevo empieza vacío.
      reset({ ...valoresPorDefecto, agrupacionId, anio, mes });
      cargado.current = null;
    }
    const anterior = deLaAgrupacion
      .filter((r) => periodo(r) < anio * 12 + mes)
      .sort((a, b) => periodo(b) - periodo(a))[0];
    // Solo si la matrícula está vacía (no se pisa lo que ya escribió).
    if (anterior && (copiada.current === clave || totalMatricula(getValues('matricula')) === 0)) {
      if (copiada.current !== clave) {
        setValue('matricula', reporteToFormData(anterior).matricula);
        copiada.current = clave;
      }
      setAviso({ tipo: 'matricula', de: anterior });
    } else {
      setAviso(null);
    }
  }, [agrupacionId, anio, mes, reportesPrevios, reset, setValue, getValues]);

  const cambiarPeriodo = (nuevoAnio: number, nuevoMes: number) => {
    setAnio(nuevoAnio);
    setMes(nuevoMes);
    setValue('anio', nuevoAnio);
    setValue('mes', nuevoMes);

    if (resetearAlCambiarPeriodo) {
      setValue('fechasEnsayos', []);
      setValue('temasRepertorio', []);
      setValue('matricula', MATRICULA_VACIA);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="reporte-mensual-form"
    >
      <div className="reporte-periodo">
        <h2>{titulo}</h2>
        <PeriodoSelector anio={anio} mes={mes} onChange={cambiarPeriodo} />
      </div>

      {mensajeExito && (
        <div className="alert-success">
          {mensajeExito}
          {onExitoDismiss && (
            <button
              type="button"
              style={{ marginLeft: '1rem' }}
              className="btn btn-secondary"
              onClick={onExitoDismiss}
            >
              OK
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="alert-error">
          {error.message}
        </div>
      )}

      <section>
        <Controller
          name="agrupacionId"
          control={control}
          rules={{ required: 'Seleccione una agrupación' }}
          render={({ field }) => (
            <AgrupacionSelector
              agrupaciones={agrupaciones}
              value={field.value}
              onChange={field.onChange}
              error={errors.agrupacionId?.message}
              isLoading={loadingAgr}
            />
          )}
        />
        {aviso?.tipo === 'existente' && (
          <p className="aviso-info">
            Ya hay un reporte de {MESES[mes - 1]} {anio} para esta agrupación
            {aviso.de.actualizadoPor ? ` (guardado por ${aviso.de.actualizadoPor})` : ''}. Lo cargamos para que lo
            revises: al guardar se reemplaza.
          </p>
        )}
        {aviso?.tipo === 'matricula' && (
          <p className="aviso-info">
            Copiamos la matrícula de {MESES[aviso.de.mes - 1]} {aviso.de.anio}. Revísala y cámbiala si hubo altas o bajas.
          </p>
        )}
      </section>

      <section>
        <Controller
          name="fechasEnsayos"
          control={control}
          rules={{
            validate: (v) => v.length > 0 || 'Registre y guarde al menos un ensayo',
          }}
          render={({ field }) => (
            <FechasEnsayoPicker
              anio={anio}
              mes={mes}
              fechas={field.value}
              onChange={field.onChange}
              error={errors.fechasEnsayos?.message as string | undefined}
            />
          )}
        />
      </section>

      <section>
        <Controller
          name="temasRepertorio"
          control={control}
          rules={{
            validate: (v) => v.length > 0 || 'Agregue y guarde al menos un tema',
          }}
          render={({ field }) => (
            <RepertorioInput
              temas={field.value}
              onChange={field.onChange}
              error={errors.temasRepertorio?.message as string | undefined}
            />
          )}
        />
      </section>

      <section>
        <Controller
          name="matricula"
          control={control}
          rules={{
            validate: (v) =>
              totalMatricula(v) > 0 || 'Guarde la matrícula con al menos un integrante',
          }}
          render={({ field }) => (
            <MatriculaPanel
              matricula={field.value}
              onChange={field.onChange}
              error={errors.matricula?.message as string | undefined}
            />
          )}
        />
      </section>

      <section>
        <label htmlFor="observaciones">Observaciones</label>
        <Controller
          name="observaciones"
          control={control}
          render={({ field }) => (
            <textarea
              id="observaciones"
              placeholder="Notas adicionales..."
              {...field}
            />
          )}
        />
      </section>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isSubmitting || !agrupacionId}
      >
        {isSubmitting ? 'Guardando...' : textoBoton}
      </button>
    </form>
  );
}
