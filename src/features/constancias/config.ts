import type { Firmante } from './types/constancia.types';

/**
 * Configuración de constancias: para cambiar quién firma, el número de la
 * coordinación o el servicio donde se guardan, edita este archivo.
 */

/**
 * URL del Web App de constancias (termina en /exec), independiente del de
 * reportes. Cómo obtenerla: apps-script/constancias/INSTRUCCIONES.md
 */
export const URL_CONSTANCIAS = 'https://script.google.com/macros/s/AKfycbyLV0Lz-HhRQY98bKuyCIGN8gLLX3QYSKkKKS171aEoJLKKLQDnipnA0V_V8H_8lANOSw/exec';

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
  cargo: 'Director del Núcleo Palmira I',
  institucion: 'Sistema Nacional de Orquestas y Coros Juveniles e Infantiles de Venezuela',
  institucionDestacada: 'FUNDAMUSICAL SIMÓN BOLIVAR',
  cargoFirma: 'Director de Núcleo',
};

/** Núcleo que emite la constancia: «…en la agrupación “X” del Núcleo Palmira I». */
export const NUCLEO = 'Núcleo Palmira I';

/** Párrafos fijos del formato del núcleo, antes del cierre. */
export const PARRAFOS_INSTITUCIONALES = [
  'La necesidad de encaminar el talento de nuestros alumnos es primordial y toda la colaboración que pueda brindarnos de sus buenos oficios; sería de gran provecho en su desarrollo psicológico y social. Su apoyo nos motiva para continuar con esta hermosa causa en beneficio de los niños, niñas y adolescentes.',
  'Tenemos la firme intención de llegar a todos los rincones del municipio. El lema de la Fundación es “Tocar, Cantar y Luchar” y a nivel internacional ya somos un gran ejemplo entre las naciones.',
];

/** Nota pequeña sobre el pie de página. */
export const NOTA_VALIDEZ = 'Esta constancia solo es válida con el sello húmedo de la institución.';

/** Pie de página: datos públicos del núcleo. */
export const PIE_CONSTANCIA = [
  'Calle 1, esquina carrera 6, Municipio Guásimos – Estado Táchira',
  'Teléfono: 0276-3945614 / Email: nucleo.palmira1@elsistema.org.ve',
];
