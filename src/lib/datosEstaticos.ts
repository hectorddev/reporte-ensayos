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
  { id: 'INICIACION_INSTRUMENTAL', codigo: 'INICIACION_INSTRUMENTAL', nombre: 'INICIACIÓN INSTRUMENTAL' },
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

export interface ElementoCatalogo {
  id: string;
  nombre: string;
}

/** Programas de formación del núcleo (un profesor puede estar en varios). */
export const PROGRAMAS: ElementoCatalogo[] = [
  { id: 'NUEVOS_INTEGRANTES', nombre: 'Nuevos integrantes' },
  { id: 'INICIACION_MUSICAL', nombre: 'Iniciación musical' },
  { id: 'ORQUESTAL', nombre: 'Orquestal' },
  { id: 'ALMA_LLANERA', nombre: 'Alma Llanera' },
  { id: 'CORAL', nombre: 'Coral' },
  { id: 'SIMON_BOLIVAR', nombre: 'Simón Bolívar' },
];

/** Programa cuyos profesores hacen informes semanales por escuela. */
export const PROGRAMA_PSB = 'SIMON_BOLIVAR';

/** Módulos escolares del Programa Simón Bolívar (escuelas del municipio). */
export const MODULOS_PSB: ElementoCatalogo[] = [
  { id: 'EB_MONSENOR_SANMIGUEL', nombre: 'E.B. Monseñor Tomás Antonio Sanmiguel' },
  { id: 'JI_MONSENOR_SAN_MIGUEL', nombre: 'Jardín de Infancia Monseñor San Miguel' },
  { id: 'EN_MIRNA_ORTIZ', nombre: 'E.N. Mirna Ninoska Ortíz' },
  { id: 'EN_ZOILA_GUERRERO', nombre: 'E.N. Zoila Guerrero Delgado' },
  { id: 'UEE_JOSE_ANTONIO_PAEZ', nombre: 'U.E.E. General José Antonio Páez' },
  { id: 'CEI_JOSEFA_CAMEJO', nombre: 'C.E.I. Josefa Venancia Camejo' },
  { id: 'EBN_FRANCISCO_ESPEJO', nombre: 'E.B.N. Francisco Silvestre Espejo' },
];

/** Nombre legible de un elemento del catálogo (o el código si no está). */
export function nombreEnCatalogo(catalogo: ElementoCatalogo[], id: string): string {
  return catalogo.find((e) => e.id === id)?.nombre ?? id;
}
