import { MIME_DOCX, guardarInformePSB, subirArchivoPSB } from '../api/psb.api';
import type { DatosInforme, InformePSB } from '../tipos';
import { semanaArchivo, textoSemana } from './fechas';
import { base64DeBlob, base64DeDataUrl, blobDeBase64 } from './fotos';
import { generarInformeDocx, nombreArchivoInforme } from './generarDocx';

export interface DocumentoListo {
  blob: Blob;
  nombre: string;
}

/** Arma el Word en el teléfono (no necesita internet). */
export async function armarDocumento(d: DatosInforme): Promise<DocumentoListo> {
  return { blob: await generarInformeDocx(d), nombre: nombreArchivoInforme(d.escuela, d.semana) };
}

/**
 * Sube las fotos y el Word al Drive de la coordinación y registra el informe.
 * `avance` recibe un texto para mostrar mientras tanto.
 */
export async function enviarInforme(
  d: DatosInforme,
  documento: DocumentoListo,
  avance: (texto: string) => void
): Promise<InformePSB> {
  const carpeta = { modulo: d.modulo, escuela: d.escuela, carpetaSemana: textoSemana(d.semana).replace(/\//g, '-') };
  const fotos: InformePSB['fotos'] = [];
  const total = d.dias.reduce((n, dia) => n + dia.fotos.length, 0);

  const dias: InformePSB['dias'] = [];
  for (const dia of [...d.dias].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const ids: string[] = [];
    for (const [i, foto] of dia.fotos.entries()) {
      avance(`Subiendo fotos (${fotos.length + 1} de ${total})…`);
      const subida = await subirArchivoPSB({
        ...carpeta,
        nombre: `${dia.fecha} foto ${i + 1}.jpg`,
        mime: 'image/jpeg',
        base64: base64DeDataUrl(foto.dataUrl),
      });
      fotos.push({ id: subida.id, url: subida.url, nombre: subida.nombre, fecha: dia.fecha });
      ids.push(subida.id);
    }
    dias.push({ fecha: dia.fecha, horaInicio: dia.horaInicio, horaFin: dia.horaFin, descripcion: dia.descripcion, fotos: ids });
  }

  avance('Guardando el informe en el Drive…');
  const archivo = await subirArchivoPSB({
    ...carpeta,
    nombre: documento.nombre,
    mime: MIME_DOCX,
    base64: await base64DeBlob(documento.blob),
  });

  avance('Registrando el informe…');
  return guardarInformePSB({
    modulo: d.modulo,
    escuela: d.escuela,
    semana: d.semana,
    semanaTexto: semanaArchivo(d.semana),
    evento: d.evento,
    agrupaciones: d.agrupaciones,
    instructores: d.instructores,
    alumnos: d.alumnos,
    dias,
    fotos,
    archivo: { id: archivo.id, url: archivo.url, nombre: archivo.nombre },
    carpeta: archivo.carpeta,
  });
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
