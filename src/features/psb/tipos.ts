/** Foto elegida en el formulario, ya reducida en el teléfono (JPEG). */
export interface FotoLocal {
  clave: string;
  dataUrl: string;
  ancho: number;
  alto: number;
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
  /** Lo que se trabajó ese día (va en «Propósitos del evento»). */
  descripcion: string;
}

export interface DiaFormulario extends DiaClase {
  fotos: FotoLocal[];
}

/** Lo que se escribe en el documento. */
export interface DatosInforme {
  modulo: string;
  escuela: string;
  /** Lunes de la semana, AAAA-MM-DD. */
  semana: string;
  evento: string;
  agrupaciones: string;
  instructores: string;
  responsable: string;
  alumnos: number;
  telefonos: string;
  dias: DiaFormulario[];
}

/** Informe registrado en el servicio (hoja «InformesPSB»). */
export interface InformePSB {
  id: string;
  modulo: string;
  escuela: string;
  semana: string;
  semanaTexto: string;
  evento: string;
  agrupaciones: string;
  instructores: string;
  alumnos: number;
  /** Días sin las fotos; las fotos van en `fotos` con su día. */
  dias: (DiaClase & { fotos: string[] })[];
  fotos: (ArchivoDrive & { fecha: string })[];
  archivo: ArchivoDrive;
  carpeta?: { id: string; url: string };
  profesor?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}
