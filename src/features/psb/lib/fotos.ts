import type { FotoLocal } from '../tipos';

/**
 * Optimización de las fotos en el teléfono antes de subirlas.
 * - Lado mayor de 1280 px: el tamaño al que Telegram deja las fotos, y a 13 cm
 *   de ancho en el Word son ~250 ppp (nítida al imprimir).
 * - JPEG con la mejor calidad que quepa en ~180 KB (una foto de 12 MP de 4 MB
 *   queda unas 25 veces más liviana): sube rápido aun con datos móviles.
 */
const LADO_MAXIMO = 1280;
const PESO_OBJETIVO = 180 * 1024;
const CALIDADES = [0.8, 0.72, 0.64, 0.56];

/** La imagen con la orientación correcta (las fotos del celular traen la rotación aparte). */
async function abrir(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch {
      // Algunos navegadores no aceptan la opción: se intenta con <img>.
    }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function comoJpeg(lienzo: HTMLCanvasElement, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    lienzo.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo preparar la foto.'))), 'image/jpeg', calidad)
  );
}

function dataUrlDeBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(lector.error ?? new Error('No se pudo leer la foto.'));
    lector.readAsDataURL(blob);
  });
}

/** Reduce la foto a JPEG de hasta 1280 px por lado y ~180 KB. */
export async function prepararFoto(archivo: File): Promise<FotoLocal> {
  const imagen = await abrir(archivo);
  const anchoOriginal = 'naturalWidth' in imagen ? imagen.naturalWidth : imagen.width;
  const altoOriginal = 'naturalHeight' in imagen ? imagen.naturalHeight : imagen.height;
  const escala = Math.min(1, LADO_MAXIMO / Math.max(anchoOriginal, altoOriginal));
  const ancho = Math.round(anchoOriginal * escala);
  const alto = Math.round(altoOriginal * escala);

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar la foto.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  if ('close' in imagen) imagen.close();

  // La mejor calidad que quepa en el peso objetivo (las fotos simples ya caben con la primera).
  let jpeg = await comoJpeg(lienzo, CALIDADES[0]);
  for (const calidad of CALIDADES.slice(1)) {
    if (jpeg.size <= PESO_OBJETIVO) break;
    jpeg = await comoJpeg(lienzo, calidad);
  }

  return {
    clave: crypto.randomUUID(),
    dataUrl: await dataUrlDeBlob(jpeg),
    ancho,
    alto,
    peso: jpeg.size,
    pesoOriginal: archivo.size,
  };
}

/** 4_250_000 → «4,1 MB»; 180_000 → «176 KB». */
export function textoPeso(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString('es-VE', { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** «data:image/jpeg;base64,AAAA» → bytes. */
export function bytesDeDataUrl(dataUrl: string): Uint8Array {
  const binario = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/** Contenido en base64 (sin el «data:…,») para enviarlo al servicio. */
export function base64DeDataUrl(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export function base64DeBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(base64DeDataUrl(String(lector.result)));
    lector.onerror = () => reject(lector.error ?? new Error('No se pudo leer el archivo.'));
    lector.readAsDataURL(blob);
  });
}

export function blobDeBase64(base64: string, tipo: string): Blob {
  return new Blob([bytesDeDataUrl(`,${base64}`) as BlobPart], { type: tipo });
}
