import { diaCorto, esVariosDias, fechaConDia, horasPorDia, rangoFechas, rangoHoras } from './textoConstancia';
import { tituloTipo, type DatosPlantilla, type Plantilla } from '../types/constancia.types';

/**
 * Plantillas: la coordinación fija tipo, fechas, días, horas y lugar; quien
 * solicita solo llena sus datos personales. Se guardan en el servicio de
 * constancias; aquí solo cómo se nombran y describen.
 */

export function tituloPlantilla(p: Pick<Plantilla, 'titulo' | 'datos'>): string {
  return p.titulo.trim() || [tituloTipo(p.datos.tipo), p.datos.eventoNombre.trim()].filter(Boolean).join(' — ');
}

interface LineaPlantilla {
  etiqueta: string;
  valor: string;
  /** Horas de un día concreto: van en el resumen completo, no en el de una línea. */
  porDia?: boolean;
}

/** Lo que fijó la coordinación, en líneas legibles para el resumen y el mensaje. */
export function describirPlantilla(d: DatosPlantilla): LineaPlantilla[] {
  const lineas: LineaPlantilla[] = [{ etiqueta: 'Constancia', valor: tituloTipo(d.tipo) }];
  if (d.eventoNombre.trim()) lineas.push({ etiqueta: 'Nombre', valor: d.eventoNombre.trim() });
  if (d.agrupacionNombre.trim()) lineas.push({ etiqueta: 'Agrupación', valor: d.agrupacionNombre.trim() });

  if (d.tipo === 'horario') {
    for (const fila of d.horario) {
      lineas.push({ etiqueta: fila.dia, valor: `${rangoHoras(fila.horaInicio, fila.horaFin)} · ${fila.actividad}` });
    }
  } else if (d.fecha) {
    const varios = esVariosDias(d);
    lineas.push(
      varios
        ? { etiqueta: 'Fechas', valor: rangoFechas(d.fecha, d.fechaFin) }
        : { etiqueta: 'Fecha', valor: fechaConDia(d.fecha) }
    );
    const porDia = horasPorDia(d);
    for (const h of porDia) {
      lineas.push({ etiqueta: diaCorto(h.fecha), valor: rangoHoras(h.horaInicio, h.horaFin), porDia: true });
    }
    const horas = rangoHoras(d.horaInicio, d.horaFin);
    if (horas && !porDia.length) lineas.push({ etiqueta: varios ? 'Horario (cada día)' : 'Horario', valor: horas });
  }
  if (d.lugar.trim()) lineas.push({ etiqueta: 'Lugar', valor: d.lugar.trim() });
  return lineas;
}

/** Resumen de una línea (tarjetas y listas). */
export function resumenPlantilla(p: Plantilla): string {
  return describirPlantilla(p.datos)
    .slice(1)
    .filter((l) => !l.porDia)
    .map((l) => l.valor)
    .join(' · ');
}
