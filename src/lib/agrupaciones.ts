import { useQuery } from '@tanstack/react-query';
import { AGRUPACIONES as INICIALES } from './datosEstaticos';
import { llamarServicio } from './nube';
import type { Agrupacion } from '../features/reporte-mensual/types/reporteMensual.types';

/**
 * Catálogo de agrupaciones: vive en la hoja «Agrupaciones» del servicio de
 * reportes y la coordinación lo edita en el panel. Se guarda una copia en el
 * teléfono para usarlo sin conexión; la primera vez, sin conexión, se usa la
 * lista con la que nació el sitio.
 */

export interface AgrupacionCatalogo extends Agrupacion {
  /** Las inactivas no se ofrecen en los formularios, pero sus reportes conservan el nombre. */
  activa: boolean;
}

const CLAVE_CACHE = 'catalogo_agrupaciones';

function leerCache(): AgrupacionCatalogo[] | null {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_CACHE) ?? 'null');
    return Array.isArray(datos) && datos.length ? datos : null;
  } catch {
    return null;
  }
}

let catalogo: AgrupacionCatalogo[] = leerCache() ?? INICIALES.map((a) => ({ ...a, activa: true }));

/** Todas, también las inactivas (para mostrar nombres de reportes viejos). */
export function todasLasAgrupaciones(): AgrupacionCatalogo[] {
  return catalogo;
}

export function buscarAgrupacion(id: string): AgrupacionCatalogo | undefined {
  return catalogo.find((a) => a.id === id);
}

/** Trae el catálogo del servicio y lo guarda en el teléfono. */
export async function cargarAgrupaciones(): Promise<AgrupacionCatalogo[]> {
  try {
    const lista = await llamarServicio<{ id: string; nombre: string; activa: boolean }[]>('listarAgrupaciones', {}, {});
    if (lista.length) {
      catalogo = lista.map((a) => ({ id: a.id, codigo: a.id, nombre: a.nombre, activa: a.activa !== false }));
      try {
        localStorage.setItem(CLAVE_CACHE, JSON.stringify(catalogo));
      } catch {
        // Sin almacenamiento: se vuelve a pedir la próxima vez.
      }
    }
  } catch {
    // Sin conexión (o servicio anterior sin catálogo): se sigue con la copia.
  }
  return catalogo;
}

/** Catálogo completo; las pantallas filtran las activas donde corresponde. */
export function useCatalogoAgrupaciones() {
  return useQuery({
    queryKey: ['agrupaciones'],
    queryFn: cargarAgrupaciones,
    initialData: catalogo,
    initialDataUpdatedAt: 0, // la copia del teléfono se refresca enseguida
    staleTime: 5 * 60 * 1000,
  });
}

export function guardarAgrupacion(
  clave: string,
  agrupacion: { id?: string; nombre: string; activa: boolean }
): Promise<{ id: string; nombre: string; activa: boolean }> {
  return llamarServicio('guardarAgrupacion', agrupacion, { clave });
}
