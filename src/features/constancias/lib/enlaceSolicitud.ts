import {
  CAMPOS_PLANTILLA,
  datosDeSolicitud,
  type DatosPlantilla,
  type Plantilla,
  type Solicitud,
} from '../types/constancia.types';

/**
 * Solicitudes y plantillas viajan dentro del enlace (después del #, así no
 * llegan a ningún servidor): JSON compacto → deflate → base64url.
 * Prefijo "z" = comprimido, "j" = JSON plano para navegadores sin CompressionStream.
 */

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
const PATRON_SOLICITUD = /^CT\d{2}-[A-Z2-9]{6}$/;
const PATRON_PLANTILLA = /^PL\d{2}-[A-Z2-9]{6}$/;
const MAX_TITULO = 120;

/** Código corto de referencia: CT26-7KQ9PX (solicitud) o PL26-… (plantilla). */
export function generarCodigo(prefijo: 'CT' | 'PL' = 'CT'): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const sufijo = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
  return `${prefijo}${String(new Date().getFullYear()).slice(2)}-${sufijo}`;
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
function compactar(objeto: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, v]) => v !== '' && !(Array.isArray(v) && v.length === 0))
  );
}

async function codificar(objeto: object): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(compactar(objeto)));
  if (typeof CompressionStream !== 'undefined') {
    return `z${aBase64Url(await transformar(json, new CompressionStream('deflate-raw')))}`;
  }
  return `j${aBase64Url(json)}`;
}

async function decodificar(codificada: string): Promise<Record<string, unknown>> {
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
    throw new Error('El enlace está incompleto o dañado. Pide que te lo reenvíen.');
  }
  if (!objeto || typeof objeto !== 'object') throw new Error('El enlace no contiene datos válidos.');
  return objeto as Record<string, unknown>;
}

function fechaIso(valor: unknown): string {
  return typeof valor === 'string' && !Number.isNaN(Date.parse(valor)) ? valor : new Date().toISOString();
}

/* ---------- Solicitud: representante → coordinación ---------- */

export function codificarSolicitud(s: Solicitud): Promise<string> {
  return codificar(s);
}

export async function decodificarSolicitud(codificada: string): Promise<Solicitud> {
  const crudo = await decodificar(codificada);
  const codigo = typeof crudo.codigo === 'string' && PATRON_SOLICITUD.test(crudo.codigo) ? crudo.codigo : generarCodigo();
  return { ...datosDeSolicitud(crudo), codigo, creadoEn: fechaIso(crudo.creadoEn) };
}

/** Enlace que abre la solicitud en el panel de la coordinación. */
export function enlaceRevision(codificada: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}admin/constancias/revisar#s=${codificada}`;
}

export function solicitudDelHash(hash: string): string | null {
  return /[#&]s=([A-Za-z0-9_-]+)/.exec(hash)?.[1] ?? null;
}

/* ---------- Plantilla: coordinación → representantes ---------- */

export function codificarPlantilla(p: Plantilla): Promise<string> {
  return codificar({ ...p.datos, codigo: p.codigo, titulo: p.titulo, creadoEn: p.creadoEn });
}

export async function decodificarPlantilla(codificada: string): Promise<Plantilla> {
  const crudo = await decodificar(codificada);
  const datos = datosDeSolicitud(crudo);
  const codigo = typeof crudo.codigo === 'string' && PATRON_PLANTILLA.test(crudo.codigo) ? crudo.codigo : generarCodigo('PL');
  return {
    codigo,
    titulo: typeof crudo.titulo === 'string' ? crudo.titulo.slice(0, MAX_TITULO) : '',
    creadoEn: fechaIso(crudo.creadoEn),
    datos: Object.fromEntries(CAMPOS_PLANTILLA.map((c) => [c, datos[c]])) as DatosPlantilla,
  };
}

/** Enlace público que abre el formulario con la plantilla aplicada. */
export function enlacePlantilla(codificada: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}constancias#p=${codificada}`;
}

export function plantillaDelHash(hash: string): string | null {
  return /[#&]p=([A-Za-z0-9_-]+)/.exec(hash)?.[1] ?? null;
}
