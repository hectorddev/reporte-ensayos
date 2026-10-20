import { escribirLista, guardarPrimero, leerLista } from './almacenLocal';
import { fechaConDia, hoyIso, rangoHoras } from './textoConstancia';
import { tituloTipo, type DatosPlantilla, type Plantilla } from '../types/constancia.types';

/**
 * Plantillas: la coordinación fija tipo, fechas, días, horas y lugar, y comparte
 * un enlace. Sin servidor, cada lista vive en el navegador de quien la usa:
 * - creadas: las que hizo la coordinación en este dispositivo.
 * - recibidas: las que abrió un representante desde un enlace.
 */

const CLAVE_CREADAS = 'constancias_plantillas';
const CLAVE_RECIBIDAS = 'constancias_plantillas_recibidas';
const MAX_PLANTILLAS = 100;
/** Una plantilla de evento deja de mostrarse al público 30 días después de su última fecha. */
const DIAS_VIGENCIA = 30;

/* ---------- Coordinación ---------- */

export function leerPlantillas(): Plantilla[] {
  return leerLista<Plantilla>(CLAVE_CREADAS);
}

export function buscarPlantilla(codigo: string): Plantilla | undefined {
  return leerPlantillas().find((p) => p.codigo === codigo);
}

export function guardarPlantilla(p: Plantilla): void {
  guardarPrimero(CLAVE_CREADAS, p, (x) => x.codigo === p.codigo, MAX_PLANTILLAS);
}

export function eliminarPlantilla(codigo: string): void {
  escribirLista(CLAVE_CREADAS, leerPlantillas().filter((p) => p.codigo !== codigo), MAX_PLANTILLAS);
}

/* ---------- Representante ---------- */

export interface PlantillaRecibida {
  plantilla: Plantilla;
  codificada: string;
}

export function plantillaVigente(p: Plantilla, hoy: string = hoyIso()): boolean {
  const ultima = p.datos.fechaFin || p.datos.fecha;
  if (!ultima) return true; // horario o participación: no vencen
  const [anio, mes, dia] = ultima.split('-').map(Number);
  const limite = new Date(Date.UTC(anio, mes - 1, dia + DIAS_VIGENCIA));
  return limite.toISOString().slice(0, 10) >= hoy;
}

export function leerRecibidas(): PlantillaRecibida[] {
  return leerLista<PlantillaRecibida>(CLAVE_RECIBIDAS).filter((r) => plantillaVigente(r.plantilla));
}

export function recordarRecibida(plantilla: Plantilla, codificada: string): void {
  guardarPrimero(
    CLAVE_RECIBIDAS,
    { plantilla, codificada },
    (x) => x.plantilla.codigo === plantilla.codigo,
    MAX_PLANTILLAS
  );
}

/* ---------- Descripción ---------- */

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
