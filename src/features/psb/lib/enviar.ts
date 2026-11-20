import { guardarDiaPSB, subirArchivoPSB, type ArchivoDescargado } from '../api/psb.api';
import type { ArchivoDrive, DatosDelDia, DatosInforme, DiaFormulario, FotoLocal, InformePSB } from '../tipos';
import { semanaArchivo, textoSemana } from './fechas';
import { base64DeDataUrl, blobDeBase64 } from './fotos';
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

/** Foto de Drive → foto en el navegador (con sus medidas, para el Word). */
async function fotoDesdeDrive(id: string, bajar: (id: string) => Promise<ArchivoDescargado>): Promise<FotoLocal> {
  const { base64 } = await bajar(id);
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  return { clave: id, dataUrl, ancho: img.naturalWidth, alto: img.naturalHeight };
}

/** Lo que la coordinación completa para el Word (lo demás sale de las clases). */
export type DatosWord = Pick<DatosInforme, 'evento' | 'agrupaciones' | 'instructores' | 'responsable' | 'alumnos' | 'telefonos'>;

/**
 * Arma el Word de la semana con las clases guardadas: baja sus fotos de Drive
 * (a través del servicio) y lo genera en el navegador, listo para descargar.
 */
export async function armarWordSemana(
  inf: InformePSB,
  datos: DatosWord,
  bajarFoto: (id: string) => Promise<ArchivoDescargado>,
  avance: Avance
): Promise<DocumentoListo> {
  const total = inf.dias.reduce((n, d) => n + d.fotos.length, 0);
  let bajadas = 0;
  const dias: DiaFormulario[] = [];
  for (const dia of inf.dias) {
    const fotos: FotoLocal[] = [];
    for (const f of dia.fotos) {
      bajadas += 1;
      avance(`Preparando fotos (${bajadas} de ${total})…`);
      fotos.push(await fotoDesdeDrive(f.id, bajarFoto));
    }
    dias.push({ fecha: dia.fecha, horaInicio: dia.horaInicio, horaFin: dia.horaFin, descripcion: dia.descripcion, fotos });
  }

  avance('Armando el Word…');
  const blob = await generarInformeDocx({ modulo: inf.modulo, escuela: inf.escuela, semana: inf.semana, ...datos, dias });
  return { blob, nombre: nombreArchivoInforme(inf.escuela, inf.semana) };
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
