import { hoyIso } from '../../constancias/lib/textoConstancia';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function partes(iso: string) {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return { anio, mes, dia };
}

function sumarDias(iso: string, n: number): string {
  const { anio, mes, dia } = partes(iso);
  return new Date(Date.UTC(anio, mes - 1, dia + n)).toISOString().slice(0, 10);
}

const dd = (n: number) => String(n).padStart(2, '0');

/** Lunes de la semana de esa fecha. */
export function lunesDe(iso: string): string {
  const { anio, mes, dia } = partes(iso);
  const semana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(); // 0 = domingo
  return sumarDias(iso, semana === 0 ? -6 : 1 - semana);
}

/** Lunes a viernes de la semana. */
export function diasHabiles(lunes: string): string[] {
  return [0, 1, 2, 3, 4].map((n) => sumarDias(lunes, n));
}

/** «09/11» */
function diaMes(iso: string): string {
  const { mes, dia } = partes(iso);
  return `${dd(dia)}/${dd(mes)}`;
}

/** «Semana del 09/11 al 13/11/2026» */
export function textoSemana(lunes: string): string {
  const viernes = sumarDias(lunes, 4);
  return `Semana del ${diaMes(lunes)} al ${diaMes(viernes)}/${partes(viernes).anio}`;
}

/** «SEMANA DEL 09-11 AL 13-11-2026», como en el nombre del archivo del núcleo. */
export function semanaArchivo(lunes: string): string {
  const viernes = sumarDias(lunes, 4);
  const guion = (iso: string) => diaMes(iso).replace('/', '-');
  return `SEMANA DEL ${guion(lunes)} AL ${guion(viernes)}-${partes(viernes).anio}`;
}

/** Semanas para elegir: esta y las anteriores. */
export function semanasRecientes(cantidad = 8, hoy = hoyIso()): { lunes: string; texto: string }[] {
  const actual = lunesDe(hoy);
  return Array.from({ length: cantidad }, (_, i) => {
    const lunes = sumarDias(actual, -7 * i);
    const extra = i === 0 ? ' (esta semana)' : i === 1 ? ' (semana pasada)' : '';
    return { lunes, texto: `${textoSemana(lunes)}${extra}` };
  });
}

/** 14:00 → «02:00 PM», como en el formato del núcleo. */
function hora(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${dd(h12)}:${dd(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

/** «09/11/2026 (08:00 AM – 12:00 PM)» */
export function fechaYHora(d: { fecha: string; horaInicio: string; horaFin: string }): string {
  const { anio } = partes(d.fecha);
  return `${diaMes(d.fecha)}/${anio} (${hora(d.horaInicio)} – ${hora(d.horaFin)})`;
}

/** «CLASE DEL DÍA 09 DE NOVIEMBRE» */
export function tituloClase(fecha: string): string {
  const { mes, dia } = partes(fecha);
  return `CLASE DEL DÍA ${dd(dia)} DE ${MESES[mes - 1].toUpperCase()}`;
}
