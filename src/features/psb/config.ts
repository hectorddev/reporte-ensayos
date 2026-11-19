import { FIRMANTE } from '../constancias/config';

/**
 * Datos fijos del informe semanal del Programa Simón Bolívar (formato del
 * núcleo). Los teléfonos los da el servicio (propiedad TELEFONOS_NUCLEO) para
 * no dejar números personales en el código del sitio.
 */
export const INFORME_PSB = {
  nucleoEstado: 'PALMIRA 1 - TÁCHIRA',
  director: FIRMANTE.nombre,
  correo: 'NUCLEO.PALMIRA1@ELSISTEMA.ORG.VE',
  programa: 'PROGRAMA SIMÓN BOLÍVAR',
  telefonosPorDefecto: '0276-3945614',
  eventoPorDefecto: 'Clases grupales',
  /** Fotos por día (más no caben bien en la hoja). */
  maxFotosPorDia: 4,
};
