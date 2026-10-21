import { describirPlantilla, tituloPlantilla } from './plantillas';
import { tituloTipo, type Constancia, type Plantilla, type Solicitud } from '../types/constancia.types';

/** Teléfono venezolano a formato internacional para wa.me: 0414-1234567 → 584141234567. */
function telefonoWhatsApp(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.startsWith('58')) return digitos;
  if (digitos.startsWith('0')) return `58${digitos.slice(1)}`;
  return digitos.length === 10 ? `58${digitos}` : digitos;
}

/** Sin número, WhatsApp deja elegir el contacto. */
export function enlaceWhatsApp(telefono: string, mensaje: string): string {
  const numero = telefonoWhatsApp(telefono);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function urlDelSitio(ruta: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}${ruta}`;
}

/** Enlace corto para que la coordinación abra la solicitud: /r/CT26-XXXXXX */
export function enlaceRevision(codigo: string): string {
  return urlDelSitio(`r/${codigo}`);
}

/** Enlace corto de una plantilla para los representantes: /p/PL26-XXXXXX */
export function enlacePlantilla(codigo: string): string {
  return urlDelSitio(`p/${codigo}`);
}

/** Aviso corto a la coordinación: los datos ya están guardados en el servicio. */
export function mensajeSolicitud(s: Pick<Solicitud, 'codigo' | 'tipo' | 'estudianteNombre' | 'representanteNombre' | 'representanteTelefono'>): string {
  const quien = s.representanteNombre ? `Representante: ${s.representanteNombre}` : 'Estudiante mayor de edad';
  return [
    `Solicitud de constancia ${s.codigo}`,
    `${tituloTipo(s.tipo)} · ${s.estudianteNombre}`,
    `${quien} · ${s.representanteTelefono}`,
    `Revisar: ${enlaceRevision(s.codigo)}`,
  ].join('\n');
}

/** Mensaje para compartir una plantilla en un grupo de WhatsApp. */
export function mensajePlantilla(p: Plantilla): string {
  const detalles = describirPlantilla(p.datos)
    .slice(1)
    .map((l) => `${l.etiqueta}: ${l.valor}`);
  return [
    `Constancia: ${tituloPlantilla(p)}`,
    ...detalles,
    '',
    `¿Necesitas la constancia? Llena tus datos aquí: ${enlacePlantilla(p.codigo)}`,
  ].join('\n');
}

/** Aviso de la coordinación al solicitante (representante, o el estudiante si es mayor). */
export function mensajeParaRepresentante(c: Constancia): string {
  const saludo = `Hola ${c.representanteNombre || c.estudianteNombre}.`;
  if (c.estado === 'rechazada') {
    const motivo = c.motivoRechazo ? `: ${c.motivoRechazo}` : '.';
    return `${saludo} La solicitud de constancia ${c.codigo} de ${c.estudianteNombre} no pudo ser aprobada${motivo}`;
  }
  const entrega =
    c.entrega === 'representante'
      ? 'Se la enviamos en PDF por este chat para que la imprima.'
      : 'Puede retirarla firmada y sellada en la coordinación.';
  return `${saludo} La constancia ${c.codigo} de ${c.estudianteNombre} fue aprobada. ${entrega}`;
}

export function nombreArchivoPdf(c: Pick<Solicitud, 'tipo' | 'estudianteNombre' | 'codigo'>): string {
  const limpio = `Constancia ${tituloTipo(c.tipo)} - ${c.estudianteNombre || c.codigo}`
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim();
  return `${limpio}.pdf`;
}
