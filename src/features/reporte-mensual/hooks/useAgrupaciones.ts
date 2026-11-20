import { useCatalogoAgrupaciones } from '../../../lib/agrupaciones';

/** Agrupaciones activas para los formularios (el catálogo lo edita la coordinación). */
export function useAgrupaciones() {
  const consulta = useCatalogoAgrupaciones();
  return { ...consulta, data: consulta.data.filter((a) => a.activa) };
}
