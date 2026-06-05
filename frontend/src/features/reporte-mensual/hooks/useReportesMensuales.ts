import { useQuery } from '@tanstack/react-query';
import { fetchReportesMensuales, type FiltrosReportes } from '../api/reporteMensual.api';

export function useReportesMensuales(filtros?: FiltrosReportes) {
  return useQuery({
    queryKey: ['reportes-mensuales', filtros],
    queryFn: () => fetchReportesMensuales(filtros),
  });
}
