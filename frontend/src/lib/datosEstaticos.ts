import type { Agrupacion } from '../features/reporte-mensual/types/reporteMensual.types';

/**
 * Catálogo fijo de agrupaciones. Antes venía de la base de datos (seed);
 * ahora vive en el frontend porque la app es 100% estática (localStorage).
 * El id es el propio código: estable y legible.
 */
export const AGRUPACIONES: Agrupacion[] = [
  { id: 'PNISPIM', codigo: 'PNISPIM', nombre: 'PNISPIM' },
  { id: 'DOPIM', codigo: 'DOPIM', nombre: 'DOPIM' },
  { id: 'RE_Y_MIPIM', codigo: 'RE_Y_MIPIM', nombre: 'RE Y MIPIM' },
  { id: 'PREPARATORIO_PIM', codigo: 'PREPARATORIO_PIM', nombre: 'PREPARATORIO PIM' },
  { id: 'PRE_INFANTIL_ETAPA_1', codigo: 'PRE_INFANTIL_ETAPA_1', nombre: 'PRE INFANTIL ETAPA 1' },
  { id: 'CORO_INFANTIL', codigo: 'CORO_INFANTIL', nombre: 'CORO INFANTIL' },
  { id: 'ALMA_LLANERA_NIVEL_I', codigo: 'ALMA_LLANERA_NIVEL_I', nombre: 'ALMA LLANERA NIVEL I' },
  { id: 'ALMA_LLANERA_NIVEL_II', codigo: 'ALMA_LLANERA_NIVEL_II', nombre: 'ALMA LLANERA NIVEL II' },
  { id: 'ALMA_LLANERA_NIVEL_III', codigo: 'ALMA_LLANERA_NIVEL_III', nombre: 'ALMA LLANERA NIVEL III' },
  { id: 'ORQUESTAL_PRE_INFANTIL_E2', codigo: 'ORQUESTAL_PRE_INFANTIL_E2', nombre: 'ORQUESTAL PRE INFANTIL ETAPA 2' },
  { id: 'ORQUESTAL_INFANTIL', codigo: 'ORQUESTAL_INFANTIL', nombre: 'ORQUESTAL INFANTIL' },
];

export function buscarAgrupacion(id: string): Agrupacion | undefined {
  return AGRUPACIONES.find((a) => a.id === id);
}

/** Contraseña local del panel admin. No es seguridad real (visible en el código). */
export const ADMIN_PASSWORD = 'admin123';
