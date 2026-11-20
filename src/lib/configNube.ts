/**
 * URL del Web App de Google Apps Script (termina en /exec).
 * Mientras esté vacía, la app funciona 100% local (localStorage).
 * Cuando la pegues, los reportes se sincronizan con el Google Sheet.
 *
 * Cómo obtenerla: ver apps-script/INSTRUCCIONES.md
 * VITE_URL_REPORTES la reemplaza solo al compilar pruebas (un servicio simulado).
 */
const URL_PUBLICADA = 'https://script.google.com/macros/s/AKfycbzkysCQhQtJWUNudA-HEJBzwApBPhZEfntzjWFjAVde8d6rkio5YcwP4QFW9h-8Eecu/exec';

export const URL_NUBE: string = import.meta.env.VITE_URL_REPORTES || URL_PUBLICADA;

export function nubeActiva(): boolean {
  return URL_NUBE.trim().length > 0;
}
