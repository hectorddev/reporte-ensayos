import { ReporteFormulario } from './ReporteFormulario';
import { useReporteMensual } from '../hooks/useReporteMensual';
import type { Agrupacion, ReporteMensualFormData, ReporteMensualGuardado } from '../types/reporteMensual.types';

interface Props {
  onGuardadoExitoso?: () => void;
  /** Agrupaciones del profesor. */
  agrupaciones?: Agrupacion[];
  /** Reportes ya guardados, para precargar el mes. */
  reportes?: ReporteMensualGuardado[];
}

export function ReporteMensualForm({ onGuardadoExitoso, agrupaciones, reportes }: Props) {
  const { submitReporte, isSubmitting, error, data: resultado, reset } =
    useReporteMensual();

  const onSubmit = async (formData: ReporteMensualFormData) => {
    await submitReporte(formData);
    onGuardadoExitoso?.();
  };

  return (
    <ReporteFormulario
      titulo="Indicador mensual"
      textoBoton="Cerrar reporte mensual"
      isSubmitting={isSubmitting}
      error={error}
      mensajeExito={
        resultado
          ? `Reporte guardado. Matrícula total: ${resultado.matriculaGuardada.totalActivos} integrantes.`
          : null
      }
      onExitoDismiss={() => reset()}
      onSubmit={onSubmit}
      agrupaciones={agrupaciones}
      reportesPrevios={reportes}
    />
  );
}
