import type { Firmante } from './types/constancia.types';

/**
 * Configuración de constancias. Vive en el código (no hay servidor):
 * para cambiar quién firma o el número de la coordinación, edita este archivo.
 */

/**
 * WhatsApp de la coordinación. Sirve formato local (0414-1234567) o
 * internacional (584141234567). Vacío: WhatsApp pide elegir el contacto.
 */
export const WHATSAPP_COORDINACION = '0424-7218061';

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
