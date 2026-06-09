const STORAGE_KEY = 'admin_password';

export function getAdminPassword(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setAdminPassword(password: string) {
  sessionStorage.setItem(STORAGE_KEY, password);
}

export function clearAdminPassword() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminPassword();
}
