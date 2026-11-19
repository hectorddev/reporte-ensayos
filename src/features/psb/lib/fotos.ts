import type { FotoLocal } from '../tipos';

/** Lado mayor de las fotos: suficiente para imprimir y liviano para subir con datos móviles. */
const LADO_MAXIMO = 1600;
const CALIDAD = 0.82;

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

/** Reduce la foto a JPEG de hasta 1600 px por lado. */
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
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  if ('close' in imagen) imagen.close();

  return {
    clave: crypto.randomUUID(),
    dataUrl: lienzo.toDataURL('image/jpeg', CALIDAD),
    ancho,
    alto,
  };
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
