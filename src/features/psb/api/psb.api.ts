import { llamarServicio } from '../../../lib/nube';
import { getSesionProfesor } from '../../../lib/profesorAuth';
import type { ArchivoDrive, InformePSB } from '../tipos';

export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const comoProfesor = () => ({ cedula: getSesionProfesor()?.cedula ?? '' });

export interface ArchivoSubido extends ArchivoDrive {
  carpeta: { id: string; url: string };
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

export function guardarInformePSB(informe: Omit<InformePSB, 'id'>): Promise<InformePSB> {
  return llamarServicio<InformePSB>('guardarInformePSB', informe, comoProfesor());
}

export function listarMisInformesPSB(): Promise<InformePSB[]> {
  return llamarServicio<InformePSB[]>('listarMisInformesPSB', {}, comoProfesor());
}

export function descargarInformePSB(id: string): Promise<{ nombre: string; base64: string }> {
  return llamarServicio('descargarInformePSB', { id }, comoProfesor());
}

export function listarInformesPSB(clave: string): Promise<InformePSB[]> {
  return llamarServicio<InformePSB[]>('listarInformesPSB', {}, { clave });
}

export function descargarInformePSBCoordinacion(clave: string, id: string): Promise<{ nombre: string; base64: string }> {
  return llamarServicio('descargarInformePSBCoordinacion', { id }, { clave });
}
