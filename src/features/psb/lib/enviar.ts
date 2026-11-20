import {
  MIME_DOCX,
  descargarArchivoPSB,
  guardarDiaPSB,
  guardarInformePSB,
  subirArchivoPSB,
} from '../api/psb.api';
import type { ArchivoDrive, DatosDelDia, DiaFormulario, FotoLocal, InformePSB } from '../tipos';
import { semanaArchivo, textoSemana } from './fechas';
import { base64DeBlob, base64DeDataUrl, blobDeBase64 } from './fotos';
import { generarInformeDocx, nombreArchivoInforme } from './generarDocx';

export interface DocumentoListo {
  blob: Blob;
  nombre: string;
}

type Avance = (texto: string) => void;

/** «Semana del 16-11 al 20-11-2026»: nombre de la carpeta en Drive. */
const carpetaSemana = (lunes: string) => textoSemana(lunes).replace(/\//g, '-');

/**
 * Guarda la clase de un día: sube las fotos nuevas y registra el día con las
 * fotos que se conservan. Devuelve la semana como quedó.
 */
export async function guardarClase(
  d: {
    modulo: string;
    escuela: string;
    semana: string;
    dia: DatosDelDia;
    fotosGuardadas: ArchivoDrive[];
    fotosNuevas: FotoLocal[];
  },
  avance: Avance
): Promise<InformePSB> {
  const subidas: ArchivoDrive[] = [];
  let carpeta: { id: string; url: string } | undefined;
  for (const [i, foto] of d.fotosNuevas.entries()) {
    avance(`Subiendo fotos (${i + 1} de ${d.fotosNuevas.length})…`);
    const subida = await subirArchivoPSB({
      modulo: d.modulo,
      escuela: d.escuela,
      carpetaSemana: carpetaSemana(d.semana),
      nombre: `${d.dia.fecha} foto ${d.fotosGuardadas.length + i + 1}.jpg`,
      mime: 'image/jpeg',
      base64: base64DeDataUrl(foto.dataUrl),
    });
    subidas.push({ id: subida.id, url: subida.url, nombre: subida.nombre });
    carpeta = subida.carpeta;
  }
  avance('Guardando la clase…');
  return guardarDiaPSB({
    modulo: d.modulo,
    escuela: d.escuela,
    semana: d.semana,
    semanaTexto: semanaArchivo(d.semana),
    carpeta,
    dia: { ...d.dia, fotos: [...d.fotosGuardadas, ...subidas] },
  });
}

/** Foto de Drive → foto en el teléfono (con sus medidas, para el Word). */
async function fotoDesdeDrive(id: string): Promise<FotoLocal> {
  const { base64 } = await descargarArchivoPSB(id);
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  return { clave: id, dataUrl, ancho: img.naturalWidth, alto: img.naturalHeight };
}

/**
 * Arma el Word de la semana con las clases guardadas (baja sus fotos de Drive),
 * lo sube a la carpeta de la semana y lo registra.
 */
export async function armarWordSemana(
  inf: InformePSB,
  semanal: { evento: string; agrupaciones: string; instructores: string; alumnos: number },
  datos: { responsable: string; telefonos: string },
  avance: Avance
): Promise<{ informe: InformePSB; documento: DocumentoListo }> {
  const total = inf.dias.reduce((n, d) => n + d.fotos.length, 0);
  let bajadas = 0;
  const dias: DiaFormulario[] = [];
  for (const dia of inf.dias) {
    const fotos: FotoLocal[] = [];
    for (const f of dia.fotos) {
      bajadas += 1;
      avance(`Preparando fotos (${bajadas} de ${total})…`);
      fotos.push(await fotoDesdeDrive(f.id));
    }
    dias.push({ fecha: dia.fecha, horaInicio: dia.horaInicio, horaFin: dia.horaFin, descripcion: dia.descripcion, fotos });
  }

  avance('Armando el Word…');
  const blob = await generarInformeDocx({
    modulo: inf.modulo,
    escuela: inf.escuela,
    semana: inf.semana,
    ...semanal,
    ...datos,
    dias,
  });
  const documento = { blob, nombre: nombreArchivoInforme(inf.escuela, inf.semana) };

  avance('Guardando el Word en el Drive…');
  const archivo = await subirArchivoPSB({
    modulo: inf.modulo,
    escuela: inf.escuela,
    carpetaSemana: carpetaSemana(inf.semana),
    nombre: documento.nombre,
    mime: MIME_DOCX,
    base64: await base64DeBlob(blob),
  });
  const informe = await guardarInformePSB({
    modulo: inf.modulo,
    semana: inf.semana,
    ...semanal,
    archivo: { id: archivo.id, url: archivo.url, nombre: archivo.nombre },
    carpeta: archivo.carpeta,
  });
  return { informe, documento };
}

/** ¿Se guardaron, corrigieron o quitaron clases después del último Word? */
export function wordDesactualizado(inf: InformePSB): boolean {
  if (!inf.archivo || !inf.wordEn) return false;
  const ultimoCambio = inf.clasesEn ?? inf.dias.reduce((m, d) => ((d.guardadoEn ?? '') > m ? d.guardadoEn ?? '' : m), '');
  return ultimoCambio > inf.wordEn;
}

/**
 * Comparte el mensaje con las fotos (en el celular abre la lista de apps para
 * elegir Telegram). Siempre copia el texto, por si la app no lo toma.
 */
export async function compartirClase(mensaje: string, fotos: FotoLocal[]): Promise<'compartido' | 'copiado'> {
  await navigator.clipboard?.writeText(mensaje).catch(() => undefined);
  const archivos = fotos.map((f, i) => new File([blobDeBase64(base64DeDataUrl(f.dataUrl), 'image/jpeg')], `foto-${i + 1}.jpg`, { type: 'image/jpeg' }));
  const conFotos = { text: mensaje, files: archivos };
  try {
    if (archivos.length && navigator.canShare?.(conFotos)) {
      await navigator.share(conFotos);
      return 'compartido';
    }
    if (navigator.share) {
      await navigator.share({ text: mensaje });
      return 'compartido';
    }
  } catch (err) {
    // Si la persona cerró la lista de apps, no es un error.
    if (err instanceof DOMException && err.name === 'AbortError') return 'compartido';
  }
  return 'copiado';
}

/** Descarga un archivo en el equipo. */
export function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function descargarBase64(base64: string, nombre: string) {
  descargar(blobDeBase64(base64, MIME_DOCX), nombre);
}
