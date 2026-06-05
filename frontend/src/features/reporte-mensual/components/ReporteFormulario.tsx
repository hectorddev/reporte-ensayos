import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { AgrupacionSelector } from './AgrupacionSelector';
import { PeriodoSelector } from './PeriodoSelector';
import { FechasEnsayoPicker } from './FechasEnsayoPicker';
import { RepertorioInput } from './RepertorioInput';
import { MatriculaPanel } from './MatriculaPanel';
import { useAgrupaciones } from '../hooks/useAgrupaciones';
import {
  MATRICULA_VACIA,
  totalMatricula,
  type ReporteMensualFormData,
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
}

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
}: Props) {
  const iniciales = valoresIniciales ?? valoresPorDefecto;
  const [anio, setAnio] = useState(iniciales.anio);
  const [mes, setMes] = useState(iniciales.mes);

  const { data: agrupaciones = [], isLoading: loadingAgr } = useAgrupaciones();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
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
