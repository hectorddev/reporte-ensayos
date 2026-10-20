import { datosDeSolicitud, type Solicitud } from '../types/constancia.types';

/**
 * La solicitud viaja dentro del enlace (después del #, así no llega a ningún
 * servidor): JSON compacto → deflate → base64url. Prefijo "z" = comprimido,
 * "j" = JSON plano para navegadores sin CompressionStream.
 */

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
const PATRON_CODIGO = /^CT\d{2}-[A-Z2-9]{6}$/;

/** Código corto de referencia, ej. CT26-7KQ9PX. */
export function generarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const sufijo = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
  return `CT${String(new Date().getFullYear()).slice(2)}-${sufijo}`;
}

function aBase64Url(bytes: Uint8Array): string {
  let binario = '';
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): Uint8Array {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

async function transformar(bytes: Uint8Array, flujo: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const salida = new Blob([bytes as BlobPart]).stream().pipeThrough(flujo);
  return new Uint8Array(await new Response(salida).arrayBuffer());
}

/** Quita campos vacíos para que el enlace sea lo más corto posible. */
function compactar(s: Solicitud): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(s).filter(([, v]) => v !== '' && !(Array.isArray(v) && v.length === 0))
  );
}

export async function codificarSolicitud(s: Solicitud): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(compactar(s)));
  if (typeof CompressionStream !== 'undefined') {
    return `z${aBase64Url(await transformar(json, new CompressionStream('deflate-raw')))}`;
  }
  return `j${aBase64Url(json)}`;
}

export async function decodificarSolicitud(codificada: string): Promise<Solicitud> {
  let objeto: unknown;
  try {
    let bytes = deBase64Url(codificada.slice(1));
    if (codificada.startsWith('z')) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('Este navegador no puede abrir el enlace. Actualízalo o usa Chrome.');
      }
      bytes = await transformar(bytes, new DecompressionStream('deflate-raw'));
    } else if (!codificada.startsWith('j')) {
      throw new Error('formato');
    }
    objeto = JSON.parse(new TextDecoder().decode(bytes));
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Este navegador')) throw err;
    throw new Error('El enlace está incompleto o dañado. Pide al representante que lo reenvíe.');
  }
  if (!objeto || typeof objeto !== 'object') throw new Error('El enlace no contiene una solicitud.');

  const crudo = objeto as Record<string, unknown>;
  const codigo = typeof crudo.codigo === 'string' && PATRON_CODIGO.test(crudo.codigo) ? crudo.codigo : generarCodigo();
  const creadoEn =
    typeof crudo.creadoEn === 'string' && !Number.isNaN(Date.parse(crudo.creadoEn))
      ? crudo.creadoEn
      : new Date().toISOString();
  return { ...datosDeSolicitud(crudo), codigo, creadoEn };
}

/** Enlace que abre la solicitud en el panel de la coordinación. */
export function enlaceRevision(codificada: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}admin/constancias/revisar#s=${codificada}`;
}

export function solicitudDelHash(hash: string): string | null {
  return /[#&]s=([A-Za-z0-9_-]+)/.exec(hash)?.[1] ?? null;
}
