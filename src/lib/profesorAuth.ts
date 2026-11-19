/**
 * Sesión del profesor en este equipo: su cédula (con la que entra) y el perfil
 * que le asignó la coordinación. Igual que la de coordinación, puede quedar
 * guardada en el equipo (localStorage) o solo mientras dure la pestaña.
 */
export interface SesionProfesor {
  cedula: string;
  nombre: string;
  /** Códigos de las agrupaciones asignadas (reportes de ensayo). */
  agrupaciones: string[];
  /** Programas de formación en los que está (ver PROGRAMAS). */
  programas: string[];
  /** Escuelas del Programa Simón Bolívar asignadas (ver MODULOS_PSB). */
  modulos: string[];
  /** Teléfonos del núcleo para los informes (los configura la coordinación). */
  telefonosNucleo?: string;
}

const textos = (v: unknown): string[] => (Array.isArray(v) ? v.filter((a): a is string => typeof a === 'string') : []);

const CLAVE = 'sesion_profesor';

function leer(almacen: () => Storage): SesionProfesor | null {
  try {
    const raw = almacen().getItem(CLAVE);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<SesionProfesor>;
    if (typeof s.cedula !== 'string' || !s.cedula) return null;
    return {
      cedula: s.cedula,
      nombre: typeof s.nombre === 'string' ? s.nombre : '',
      agrupaciones: textos(s.agrupaciones),
      programas: textos(s.programas),
      modulos: textos(s.modulos),
      telefonosNucleo: typeof s.telefonosNucleo === 'string' ? s.telefonosNucleo : undefined,
    };
  } catch {
    return null;
  }
}

/** En qué almacén quedó la sesión, para actualizarla en el mismo. */
function almacenDeSesion(): Storage | null {
  try {
    if (localStorage.getItem(CLAVE)) return localStorage;
    if (sessionStorage.getItem(CLAVE)) return sessionStorage;
  } catch {
    // Sin acceso al almacenamiento.
  }
  return null;
}

export function getSesionProfesor(): SesionProfesor | null {
  return leer(() => localStorage) ?? leer(() => sessionStorage);
}

export function setSesionProfesor(sesion: SesionProfesor, recordar: boolean) {
  cerrarSesionProfesor();
  const texto = JSON.stringify(sesion);
  try {
    (recordar ? localStorage : sessionStorage).setItem(CLAVE, texto);
  } catch {
    try {
      sessionStorage.setItem(CLAVE, texto);
    } catch {
      // Sin almacenamiento: habrá que escribir la cédula de nuevo.
    }
  }
}

/** Nombre y agrupaciones al día (la coordinación pudo cambiarlos). */
export function actualizarPerfilProfesor(perfil: Partial<Omit<SesionProfesor, 'cedula'>>) {
  const actual = getSesionProfesor();
  const almacen = almacenDeSesion();
  if (!actual || !almacen) return;
  try {
    almacen.setItem(CLAVE, JSON.stringify({ ...actual, ...perfil }));
  } catch {
    // Se queda con el perfil anterior.
  }
}

export function cerrarSesionProfesor() {
  for (const almacen of [() => localStorage, () => sessionStorage]) {
    try {
      almacen().removeItem(CLAVE);
    } catch {
      // Nada que borrar.
    }
  }
}

/** «V-12.345.678» → «12345678», como la guarda el servicio. */
export function normalizarCedula(cedula: string): string {
  return cedula.replace(/\D/g, '');
}
