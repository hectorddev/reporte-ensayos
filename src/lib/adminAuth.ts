/**
 * Sesión del panel: la clave de coordinación, que valida el servicio de
 * constancias (no está en el código del sitio).
 * - «Mantener la sesión abierta»: queda en este equipo (localStorage) y sirve
 *   para cualquier pestaña, p. ej. los enlaces de revisión que llegan por WhatsApp.
 * - Si no: dura lo que la pestaña (sessionStorage).
 * «Cerrar sesión» la borra de ambos.
 */
const CLAVE_COORDINACION_KEY = 'clave_coordinacion';
/** Sesiones anteriores guardaban aquí la contraseña del panel, ya eliminada. */
const CLAVE_ANTIGUA_KEY = 'admin_password';

// En modo privado o con el almacenamiento bloqueado, el acceso puede fallar.
function leer(almacen: () => Storage): string | null {
  try {
    return almacen().getItem(CLAVE_COORDINACION_KEY);
  } catch {
    return null;
  }
}

function borrar(almacen: () => Storage) {
  try {
    almacen().removeItem(CLAVE_COORDINACION_KEY);
    almacen().removeItem(CLAVE_ANTIGUA_KEY);
  } catch {
    // Nada que borrar si no hay acceso.
  }
}

export function getClaveCoordinacion(): string | null {
  return leer(() => localStorage) ?? leer(() => sessionStorage);
}

export function setClaveCoordinacion(clave: string, recordar: boolean) {
  cerrarSesion();
  try {
    (recordar ? localStorage : sessionStorage).setItem(CLAVE_COORDINACION_KEY, clave);
  } catch {
    // Sin almacenamiento: se intenta al menos la sesión de la pestaña.
    try {
      sessionStorage.setItem(CLAVE_COORDINACION_KEY, clave);
    } catch {
      // Tampoco: habrá que escribir la clave en cada página.
    }
  }
}

export function haySesion(): boolean {
  return !!getClaveCoordinacion();
}

export function cerrarSesion() {
  borrar(() => localStorage);
  borrar(() => sessionStorage);
}
