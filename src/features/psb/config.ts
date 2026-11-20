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
  /** Encabezado del mensaje de Telegram. */
  estado: 'Táchira',
  nucleo: 'Palmira I',
  /** Sugerencias para «Tipo de actividad». */
  tiposActividad: ['Iniciación musical', 'Coral', 'Orquestal', 'Alma Llanera', 'Clases grupales'],
  /** Una foto por clase: la del mensaje de Telegram y la memoria fotográfica. */
  maxFotosPorDia: 1,
};
