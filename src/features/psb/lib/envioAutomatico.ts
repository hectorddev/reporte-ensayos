import type { InformePSB } from '../tipos';
import { enviarTodas, listarPendientes } from './cola';

/**
 * Envío automático de las clases guardadas sin internet, desde la página:
 * al abrir el sitio, al volver la conexión, al volver a la app y cada minuto.
 * En producción también registra el service worker para que Android las envíe
 * con la app cerrada.
 *
 * Avisa a las pantallas con eventos de window:
 * - «psb-clase-enviada» (detail: { semana, clave }) cuando una llega al servicio.
 * - «psb-pendientes» cuando cambia la lista de pendientes.
 */

export const EVENTO_ENVIADA = 'psb-clase-enviada';
export const EVENTO_PENDIENTES = 'psb-pendientes';

export function avisarEnviada(semana: InformePSB, clave: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_ENVIADA, { detail: { semana, clave } }));
  window.dispatchEvent(new Event(EVENTO_PENDIENTES));
}

let enCurso: Promise<void> | null = null;

/** Intenta enviar las pendientes (sin repetir si ya hay un intento en curso). */
export function enviarPendientesAhora(): Promise<void> {
  if (enCurso) return enCurso;
  enCurso = (async () => {
    try {
      if ((await listarPendientes()).every((p) => p.error)) return;
      await enviarTodas(avisarEnviada);
    } catch {
      // Sin conexión: se intentará de nuevo.
    } finally {
      window.dispatchEvent(new Event(EVENTO_PENDIENTES));
      enCurso = null;
    }
  })();
  return enCurso;
}

/** Pide al service worker que las envíe cuando haya internet (aunque se cierre la app). */
export async function pedirEnvioEnSegundoPlano(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    const registro = await navigator.serviceWorker.ready;
    const sync = (registro as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync;
    await sync?.register('psb-clases');
  } catch {
    // Sin Background Sync (p. ej. iPhone): la página las envía al volver a abrirse.
  }
}

let iniciado = false;

/** Se activa solo para profesores del Programa Simón Bolívar (al entrar o al abrir su panel). */
export function iniciarEnvioAutomatico() {
  if (iniciado || !('indexedDB' in window)) return;
  iniciado = true;
  const intentar = () => {
    if (navigator.onLine !== false) void enviarPendientesAhora();
  };
  window.addEventListener('online', intentar);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') intentar();
  });
  window.setInterval(intentar, 60_000);
  intentar();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
      if (e.data?.tipo === EVENTO_ENVIADA) avisarEnviada(e.data.semana, e.data.clave);
    });
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw-psb.js', { type: 'module' }).catch(() => undefined);
    }
  }
}
