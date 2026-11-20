import { llamarServicio } from '../../../lib/nube';
import { getSesionProfesor } from '../../../lib/profesorAuth';
import type { ArchivoDrive, DatosDelDia, InformePSB } from '../tipos';

const comoProfesor = () => ({ cedula: getSesionProfesor()?.cedula ?? '' });

export interface ArchivoSubido extends ArchivoDrive {
  carpeta: { id: string; url: string };
}

export interface ArchivoDescargado {
  nombre: string;
  base64: string;
}

/** Sube la foto de una clase a «Informes PSB / Escuela / Semana del …» en Drive. */
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

export function listarMisInformesPSB(): Promise<InformePSB[]> {
  return llamarServicio<InformePSB[]>('listarMisInformesPSB', {}, comoProfesor());
}

export function listarInformesPSB(clave: string): Promise<InformePSB[]> {
  return llamarServicio<InformePSB[]>('listarInformesPSB', {}, { clave });
}

/** Una foto de una clase (Drive es privado: pasa por el servicio). Para armar el Word. */
export function descargarArchivoPSBCoordinacion(clave: string, id: string): Promise<ArchivoDescargado> {
  return llamarServicio<ArchivoDescargado>('descargarArchivoPSBCoordinacion', { id }, { clave });
}
