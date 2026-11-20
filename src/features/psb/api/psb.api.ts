import { llamarServicio } from '../../../lib/nube';
import { getSesionProfesor } from '../../../lib/profesorAuth';
import type { ArchivoDrive, DatosDelDia, InformePSB } from '../tipos';

export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const comoProfesor = () => ({ cedula: getSesionProfesor()?.cedula ?? '' });

export interface ArchivoSubido extends ArchivoDrive {
  carpeta: { id: string; url: string };
}

export interface ArchivoDescargado {
  nombre: string;
  base64: string;
}

/** Sube una foto o el Word a «Informes PSB / Escuela / Semana del …» en Drive. */
export function subirArchivoPSB(datos: {
  modulo: string;
  escuela: string;
  carpetaSemana: string;
  nombre: string;
  mime: string;
  base64: string;
}): Promise<ArchivoSubido> {
  return llamarServicio<ArchivoSubido>('subirArchivoPSB', datos, comoProfesor());
}

/** Guarda (o corrige) la clase de un día; devuelve la semana completa. */
export function guardarDiaPSB(datos: {
  modulo: string;
  escuela: string;
  semana: string;
  semanaTexto: string;
  carpeta?: { id: string; url: string };
  dia: DatosDelDia & { fotos: ArchivoDrive[] };
}): Promise<InformePSB> {
  return llamarServicio<InformePSB>('guardarDiaPSB', datos, comoProfesor());
}

export function quitarDiaPSB(datos: { modulo: string; semana: string; fecha: string }): Promise<InformePSB> {
  return llamarServicio<InformePSB>('quitarDiaPSB', datos, comoProfesor());
}

/** Registra el Word de la semana ya subido. */
export function guardarInformePSB(datos: {
  modulo: string;
  semana: string;
  evento: string;
  agrupaciones: string;
  instructores: string;
  alumnos: number;
  archivo: ArchivoDrive;
  carpeta?: { id: string; url: string };
}): Promise<InformePSB> {
  return llamarServicio<InformePSB>('guardarInformePSB', datos, comoProfesor());
}

export function listarMisInformesPSB(): Promise<InformePSB[]> {
  return llamarServicio<InformePSB[]>('listarMisInformesPSB', {}, comoProfesor());
}

/** Una foto o el Word (Drive es privado: pasa por el servicio). */
export function descargarArchivoPSB(id: string): Promise<ArchivoDescargado> {
  return llamarServicio<ArchivoDescargado>('descargarArchivoPSB', { id }, comoProfesor());
}

export function descargarInformePSB(id: string): Promise<ArchivoDescargado> {
  return llamarServicio<ArchivoDescargado>('descargarInformePSB', { id }, comoProfesor());
}

export function listarInformesPSB(clave: string): Promise<InformePSB[]> {
  return llamarServicio<InformePSB[]>('listarInformesPSB', {}, { clave });
}

export function descargarInformePSBCoordinacion(clave: string, id: string): Promise<ArchivoDescargado> {
  return llamarServicio<ArchivoDescargado>('descargarInformePSBCoordinacion', { id }, { clave });
}
