import { useQuery } from '@tanstack/react-query';
import { fetchAgrupaciones } from '../api/reporteMensual.api';

export function useAgrupaciones() {
  return useQuery({
    queryKey: ['agrupaciones'],
    queryFn: fetchAgrupaciones,
  });
}
