/** Foto elegida en el teléfono, ya reducida (JPEG). */
export interface FotoLocal {
  clave: string;
  dataUrl: string;
  ancho: number;
  alto: number;
  /** Bytes de la foto optimizada y de la original (para mostrar cuánto se redujo). */
  peso?: number;
  pesoOriginal?: number;
}

/** Archivo guardado en el Drive de la coordinación. */
export interface ArchivoDrive {
  id: string;
  url: string;
  nombre: string;
}

export interface DiaClase {
  fecha: string; // AAAA-MM-DD
  horaInicio: string; // HH:MM
  horaFin: string;
  /** Repertorio y lo que se trabajó (va en el mensaje y en «Propósitos del evento»). */
  descripcion: string;
}

/** Lo que el formador llena de cada clase (también va en el mensaje de Telegram). */
export interface DatosDelDia extends DiaClase {
  tipoActividad: string;
  /** Ej: «14 niños». */
  atendidos: string;
  /** Ej: «2, 3 y 4 años Inicial». */
  niveles: string;
  /** Ej: «2 profesoras». */
  adultos: string;
}

/** Clase guardada en el servicio. */
export interface DiaPSB extends DatosDelDia {
  fotos: ArchivoDrive[];
  formador?: string;
  guardadoEn?: string;
}

/** Semana de una escuela en el servicio (hoja «InformesPSB»). */
export interface InformePSB {
  id: string;
  modulo: string;
  escuela: string;
  /** Lunes de la semana, AAAA-MM-DD. */
  semana: string;
  semanaTexto?: string;
  dias: DiaPSB[];
  carpeta?: { id: string; url: string };
  profesor?: string;
  /** Último cambio en las clases (guardar, corregir o quitar). */
  clasesEn?: string;
  // Del Word de la semana (cuando ya se generó).
  evento?: string;
  agrupaciones?: string;
  instructores?: string;
  alumnos?: number;
  archivo?: ArchivoDrive;
  wordEn?: string;
  wordPor?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}

/** Día con sus fotos en el teléfono, para armar el Word. */
export interface DiaFormulario extends DiaClase {
  fotos: FotoLocal[];
}

/** Lo que se escribe en el Word. */
export interface DatosInforme {
  modulo: string;
  escuela: string;
  semana: string;
  evento: string;
  agrupaciones: string;
  instructores: string;
  responsable: string;
  alumnos: number;
  telefonos: string;
  dias: DiaFormulario[];
}
