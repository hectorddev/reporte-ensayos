import { tituloTipo, type Constancia, type Solicitud } from '../types/constancia.types';

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

export function mensajeSolicitud(s: Solicitud, enlace: string): string {
  return [
    `Solicitud de constancia ${s.codigo}: ${tituloTipo(s.tipo)}`,
    `Estudiante: ${s.estudianteNombre}`,
    `Representante: ${s.representanteNombre} (${s.representanteTelefono})`,
    '',
    `Abrir para revisar: ${enlace}`,
  ].join('\n');
}

/** Aviso de la coordinación al representante según la decisión. */
export function mensajeParaRepresentante(c: Constancia): string {
  const saludo = `Hola ${c.representanteNombre}.`;
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
