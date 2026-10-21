import { fechaConDia, rangoHoras } from './textoConstancia';
import { tituloTipo, type DatosPlantilla, type Plantilla } from '../types/constancia.types';

/**
 * Plantillas: la coordinación fija tipo, fechas, días, horas y lugar; quien
 * solicita solo llena sus datos personales. Se guardan en el servicio de
 * constancias; aquí solo cómo se nombran y describen.
 */

export function tituloPlantilla(p: Pick<Plantilla, 'titulo' | 'datos'>): string {
  return p.titulo.trim() || [tituloTipo(p.datos.tipo), p.datos.eventoNombre.trim()].filter(Boolean).join(' — ');
}

/** Lo que fijó la coordinación, en líneas legibles para el resumen y el mensaje. */
export function describirPlantilla(d: DatosPlantilla): { etiqueta: string; valor: string }[] {
  const lineas: { etiqueta: string; valor: string }[] = [{ etiqueta: 'Constancia', valor: tituloTipo(d.tipo) }];
  if (d.eventoNombre.trim()) lineas.push({ etiqueta: 'Nombre', valor: d.eventoNombre.trim() });
  if (d.agrupacionNombre.trim()) lineas.push({ etiqueta: 'Agrupación', valor: d.agrupacionNombre.trim() });

  if (d.tipo === 'horario') {
    for (const fila of d.horario) {
      lineas.push({ etiqueta: fila.dia, valor: `${rangoHoras(fila.horaInicio, fila.horaFin)} · ${fila.actividad}` });
    }
  } else if (d.fecha) {
    const variosDias = d.tipo === 'jornada' && d.fechaFin && d.fechaFin !== d.fecha;
    lineas.push({
      etiqueta: variosDias ? 'Fechas' : 'Fecha',
      valor: variosDias ? `del ${fechaConDia(d.fecha)} al ${fechaConDia(d.fechaFin)}` : fechaConDia(d.fecha),
    });
    const horas = rangoHoras(d.horaInicio, d.horaFin);
    if (horas) lineas.push({ etiqueta: 'Horario', valor: horas });
  }
  if (d.lugar.trim()) lineas.push({ etiqueta: 'Lugar', valor: d.lugar.trim() });
  return lineas;
}

/** Resumen de una línea (tarjetas y listas). */
export function resumenPlantilla(p: Plantilla): string {
  return describirPlantilla(p.datos)
    .slice(1)
    .map((l) => l.valor)
    .join(' · ');
}
