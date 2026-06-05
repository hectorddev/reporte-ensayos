import { useMutation } from '@tanstack/react-query';
import { submitReporteMensual } from '../api/reporteMensual.api';
import type { ReporteMensualFormData } from '../types/reporteMensual.types';

export function useReporteMensual() {
  const mutation = useMutation({
    mutationFn: (data: ReporteMensualFormData) => submitReporteMensual(data),
  });

  return {
    submitReporte: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
