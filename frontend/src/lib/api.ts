/** Base del backend. Vacío en local = usa proxy de Vite (/api) */
export function getApiBase(): string {
  const url = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
  return url ? `${url}/api` : '/api';
}
