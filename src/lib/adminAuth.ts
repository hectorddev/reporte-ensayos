/**
 * Sesión del panel: la clave de coordinación, que valida el servicio de
 * constancias (no está en el código del sitio). Dura lo que la pestaña.
 */
const CLAVE_COORDINACION_KEY = 'clave_coordinacion';
/** Sesiones anteriores guardaban aquí la contraseña del panel, ya eliminada. */
const CLAVE_ANTIGUA_KEY = 'admin_password';

export function getClaveCoordinacion(): string | null {
  return sessionStorage.getItem(CLAVE_COORDINACION_KEY);
}

export function setClaveCoordinacion(clave: string) {
  sessionStorage.setItem(CLAVE_COORDINACION_KEY, clave);
}

export function haySesion(): boolean {
  return !!getClaveCoordinacion();
}

export function cerrarSesion() {
  sessionStorage.removeItem(CLAVE_COORDINACION_KEY);
  sessionStorage.removeItem(CLAVE_ANTIGUA_KEY);
}
