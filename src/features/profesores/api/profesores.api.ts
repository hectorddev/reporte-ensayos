import { llamarServicio } from '../../../lib/nube';
import { normalizarCedula } from '../../../lib/profesorAuth';

/** Profesor registrado por la coordinación (hoja «Profesores» del servicio de reportes). */
export interface Profesor {
  cedula: string;
  nombre: string;
  /** Códigos de las agrupaciones asignadas (reportes de ensayo). */
  agrupaciones: string[];
  /** Programas de formación (puede estar en varios). */
  programas: string[];
  /** Escuelas del Programa Simón Bolívar. */
  modulos: string[];
}

export type PerfilProfesor = Omit<Profesor, 'cedula'> & { telefonosNucleo?: string };

/** Comprueba la cédula y devuelve nombre y agrupaciones. */
export function entrarProfesor(cedula: string): Promise<PerfilProfesor> {
  return llamarServicio<PerfilProfesor>('entrarProfesor', {}, { cedula: normalizarCedula(cedula) });
}

export function listarProfesores(clave: string): Promise<Profesor[]> {
  return llamarServicio<Profesor[]>('listarProfesores', {}, { clave });
}

/**
 * Sin `cedulaAnterior` registra uno nuevo (falla si la cédula ya existe); con
 * ella actualiza a ese profesor, incluso si se corrige la cédula.
 */
export function guardarProfesor(clave: string, profesor: Profesor, cedulaAnterior?: string): Promise<Profesor> {
  return llamarServicio<Profesor>(
    'guardarProfesor',
    { profesor, cedulaAnterior, nuevo: !cedulaAnterior },
    { clave }
  );
}

export function eliminarProfesor(clave: string, cedula: string): Promise<boolean> {
  return llamarServicio<boolean>('eliminarProfesor', { cedula }, { clave });
}
