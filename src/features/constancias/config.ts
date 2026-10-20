import type { Firmante } from './types/constancia.types';

/**
 * Configuración de constancias. Vive en el código (no hay servidor):
 * para cambiar quién firma o el número de la coordinación, edita este archivo.
 */

/**
 * WhatsApp de la coordinación, con código de país y sin signos: 584141234567.
 * Vacío: WhatsApp le pide al representante elegir el contacto.
 */
export const WHATSAPP_COORDINACION = '';

/** Quien firma las constancias (texto del documento). La firma va a mano. */
export const FIRMANTE: Firmante = {
  nombre: 'Leonardo Alipio Becerra Guerrero',
  genero: 'M',
  cedula: '3.794.413',
  cargo: 'líder del Programa Alma Llanera Táchira',
  institucion: 'Sistema Nacional de Orquestas y Coros Juveniles e Infantiles de Venezuela',
  institucionDestacada: 'FUNDAMUSICAL SIMÓN BOLÍVAR',
  cargoFirma: 'Líder del programa Alma Llanera',
  telefono: '0414-7137007',
  ciudad: 'Palmira',
};
