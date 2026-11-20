/**
 * Service worker de las clases del Programa Simón Bolívar: cuando el teléfono
 * recupera internet (Background Sync, Android/Chrome), envía las clases que se
 * guardaron sin conexión, aunque la app esté cerrada. No intercepta ni guarda en
 * caché nada del sitio.
 */
import { enviarTodas } from './features/psb/lib/cola';
import type { InformePSB } from './features/psb/tipos';

// Tipos mínimos del service worker (el proyecto compila con los de la página).
interface EventoExtensible extends Event {
  waitUntil: (p: Promise<unknown>) => void;
}

interface EventoSync extends EventoExtensible {
  tag: string;
}

const sw = self as unknown as {
  skipWaiting: () => Promise<void>;
  clients: {
    claim: () => Promise<void>;
    matchAll: (o: { type: 'window'; includeUncontrolled: boolean }) => Promise<{ postMessage: (m: unknown) => void }[]>;
  };
  addEventListener: (tipo: string, fn: (e: EventoExtensible) => void) => void;
};

async function avisarVentanas(semana: InformePSB, clave: string) {
  const ventanas = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const v of ventanas) v.postMessage({ tipo: 'psb-clase-enviada', semana, clave });
}

sw.addEventListener('install', () => void sw.skipWaiting());
sw.addEventListener('activate', (e) => e.waitUntil(sw.clients.claim()));
sw.addEventListener('sync', (e) => {
  const evento = e as EventoSync;
  // Si falla por falta de red, el navegador vuelve a intentarlo más tarde.
  if (evento.tag === 'psb-clases') evento.waitUntil(enviarTodas((semana, clave) => void avisarVentanas(semana, clave)));
});
