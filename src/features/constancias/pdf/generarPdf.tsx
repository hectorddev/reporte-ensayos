import type { PropsConstanciaPdf } from './ConstanciaPdf';

const BASE = import.meta.env.BASE_URL;

/**
 * Genera el PDF en el navegador. La librería (~1 MB) se carga solo aquí, al
 * pedir el primer PDF, para no pesar en el resto del sitio.
 */
export async function generarPdfConstancia(
  props: Omit<PropsConstanciaPdf, 'recursos'>
): Promise<Blob> {
  const [{ pdf }, { ConstanciaPdf }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ConstanciaPdf'),
  ]);
  const recursos = {
    logo: new URL(`${BASE}constancias/logo-alma-llanera.png`, window.location.href).href,
    franja: new URL(`${BASE}constancias/franja-lateral.png`, window.location.href).href,
  };
  return pdf(<ConstanciaPdf {...props} recursos={recursos} />).toBlob();
}

export function descargarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Compartir archivos (WhatsApp, correo…): disponible en celulares, no en todos los PC. */
export function puedeCompartirArchivos(): boolean {
  try {
    const prueba = new File([''], 'prueba.pdf', { type: 'application/pdf' });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [prueba] });
  } catch {
    return false;
  }
}
