import fuenteCursiva from '@fontsource/carlito/files/carlito-latin-400-italic.woff?url';
import fuenteNegritaCursiva from '@fontsource/carlito/files/carlito-latin-700-italic.woff?url';
import type { PropsConstanciaPdf, RecursosPdf } from './ConstanciaPdf';

const BASE = import.meta.env.BASE_URL;

const absoluta = (ruta: string) => new URL(ruta, window.location.href).href;

/**
 * Genera el PDF en el navegador. La librería (~1 MB) se carga solo aquí, al
 * pedir el primer PDF, para no pesar en el resto del sitio.
 */
export async function generarPdfConstancia(
  props: Omit<PropsConstanciaPdf, 'recursos'>
): Promise<Blob> {
  const [{ pdf }, { ConstanciaPdf, registrarFuentes }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ConstanciaPdf'),
  ]);
  const recursos: RecursosPdf = {
    logo: absoluta(`${BASE}img/constancias/logo-el-sistema.png`),
    franja: absoluta(`${BASE}img/constancias/franja-degradado.png`),
    fuenteCursiva: absoluta(fuenteCursiva),
    fuenteNegritaCursiva: absoluta(fuenteNegritaCursiva),
  };
  registrarFuentes(recursos);
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
