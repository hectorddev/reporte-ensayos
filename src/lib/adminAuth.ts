const STORAGE_KEY = 'admin_password';
/** Clave del servicio de constancias; la valida el servidor, no este código. */
const CLAVE_COORDINACION_KEY = 'clave_coordinacion';

export function getAdminPassword(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setAdminPassword(password: string) {
  sessionStorage.setItem(STORAGE_KEY, password);
}

export function clearAdminPassword() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(CLAVE_COORDINACION_KEY);
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminPassword();
}

export function getClaveCoordinacion(): string | null {
  return sessionStorage.getItem(CLAVE_COORDINACION_KEY);
}

export function setClaveCoordinacion(clave: string) {
  sessionStorage.setItem(CLAVE_COORDINACION_KEY, clave);
}

export function clearClaveCoordinacion() {
  sessionStorage.removeItem(CLAVE_COORDINACION_KEY);
}
