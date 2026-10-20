import type { DatosSolicitud, FilaHorario, Firmante } from '../types/constancia.types';

/** Lo que necesita el texto: los datos de la solicitud + el párrafo de la coordinación. */
export type DatosDocumento = DatosSolicitud & { parrafoAdicional?: string };

/* ---------------- Fechas y números ---------------- */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const HASTA_29 = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
];

export function numeroALetras(n: number): string {
  if (n < 30) return HASTA_29[n];
  if (n < 100) {
    const u = n % 10;
    return u ? `${DECENAS[Math.floor(n / 10)]} y ${HASTA_29[u]}` : DECENAS[n / 10];
  }
  if (n === 100) return 'cien';
  if (n < 1000) {
    const r = n % 100;
    const c = CENTENAS[Math.floor(n / 100)];
    return r ? `${c} ${numeroALetras(r)}` : c;
  }
  if (n < 1_000_000) {
    const m = Math.floor(n / 1000);
    const r = n % 1000;
    const miles = m === 1 ? 'mil' : `${apocopar(numeroALetras(m))} mil`;
    return r ? `${miles} ${numeroALetras(r)}` : miles;
  }
  return String(n);
}

/** "uno" ante sustantivo masculino: veintiuno → veintiún, treinta y uno → treinta y un. */
function apocopar(texto: string): string {
  if (texto.endsWith('veintiuno')) return `${texto.slice(0, -9)}veintiún`;
  if (texto.endsWith('uno')) return texto.slice(0, -1);
  return texto;
}

function partes(iso: string): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return { anio, mes, dia };
}

export function hoyIso(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** 17 de julio de 2026 */
export function fechaLarga(iso: string): string {
  if (!iso) return '';
  const { anio, mes, dia } = partes(iso);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** sábado 17 de octubre de 2026 */
export function fechaConDia(iso: string): string {
  if (!iso) return '';
  const { anio, mes, dia } = partes(iso);
  const semana = DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return `${semana} ${fechaLarga(iso)}`;
}

/** a los diecisiete (17) días del mes de julio del año dos mil veintiséis (2026) */
export function fechaEnLetras(iso: string): string {
  const { anio, mes, dia } = partes(iso);
  const dias = dia === 1 ? 'al primer (1er) día' : `a los ${apocopar(numeroALetras(dia))} (${dia}) días`;
  return `${dias} del mes de ${MESES[mes - 1]} del año ${numeroALetras(anio)} (${anio})`;
}

/** Marca de tiempo ISO (UTC) → fecha local legible: 16 de octubre de 2026. */
export function fechaLegible(isoUtc: string): string {
  return new Date(isoUtc).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** 14:00 → 2:00 pm */
export function hora12(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const sufijo = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

export function rangoHoras(inicio: string, fin: string): string {
  if (inicio && fin) return `${hora12(inicio)} a ${hora12(fin)}`;
  return hora12(inicio || fin);
}

/** "las 2:00 pm", pero "la 1:00 pm". */
function conArticulo(hhmm: string): string {
  const h = Number(hhmm.split(':')[0]) % 12;
  return `${h === 1 ? 'la' : 'las'} ${hora12(hhmm)}`;
}

export function calcularEdad(nacimiento: string, referencia: string): number | null {
  if (!nacimiento || !referencia) return null;
  const n = partes(nacimiento);
  const r = partes(referencia);
  let edad = r.anio - n.anio;
  if (r.mes < n.mes || (r.mes === n.mes && r.dia < n.dia)) edad -= 1;
  return edad >= 0 ? edad : null;
}

/* ---------------- Contenido ---------------- */

export interface Segmento {
  texto: string;
  negrita?: boolean;
}
export type Parrafo = Segmento[];

export interface ContenidoConstancia {
  lugarYFecha: string;
  destinatario: string[];
  parrafos: Parrafo[];
  tabla: FilaHorario[] | null;
  parrafosFinales: Parrafo[];
  despedida: string;
}

/** Más de 2 días de horario o párrafo adicional: se reduce el espacio para caber en una hoja. */
export function esCompacta(contenido: ContenidoConstancia): boolean {
  return (contenido.tabla?.length ?? 0) > 2 || contenido.parrafosFinales.length > 1;
}

type Tiempo = 'pasado' | 'presente' | 'futuro';

function tiempoDe(inicio: string, fin: string, referencia: string): Tiempo {
  const ultimo = fin || inicio;
  if (!inicio || !referencia) return 'pasado';
  if (inicio > referencia) return 'futuro';
  if (ultimo < referencia) return 'pasado';
  return 'presente';
}

function textoHorario(c: DatosDocumento, diario: boolean): string {
  if (c.horaInicio && c.horaFin) {
    return `, en el horario${diario ? ' diario' : ''} comprendido entre ${conArticulo(c.horaInicio)} y ${conArticulo(c.horaFin)}`;
  }
  if (c.horaInicio) return `, a partir de ${conArticulo(c.horaInicio)}`;
  return '';
}

function texto(t: string): Segmento {
  return { texto: t };
}

/**
 * Arma el texto de la constancia. `fechaEmision` define la edad y el tiempo
 * verbal: un concierto posterior a la emisión se redacta en futuro.
 */
export function construirContenido(
  c: DatosDocumento,
  f: Firmante,
  fechaEmision: string
): ContenidoConstancia {
  const fem = c.estudianteGenero === 'F';
  const edad = calcularEdad(c.estudianteFechaNacimiento, fechaEmision);
  const sustantivo =
    edad !== null && edad < 12
      ? fem ? 'la niña' : 'el niño'
      : edad !== null && edad >= 18
        ? fem ? 'la ciudadana' : 'el ciudadano'
        : fem ? 'la joven' : 'el joven';
  const integrante = fem ? 'la integrante' : 'el integrante';
  const agrupacion = c.agrupacionNombre.trim();

  // 1. Quien suscribe
  const suscribe: Parrafo = [
    texto('Quien suscribe, '),
    { texto: f.nombre, negrita: true },
    texto(`, ${f.genero === 'F' ? 'portadora' : 'portador'} de la Cédula de Identidad N° `),
    { texto: f.cedula, negrita: true },
  ];
  if (f.cargo) suscribe.push(texto(', fungiendo como '), { texto: f.cargo, negrita: true });
  if (f.institucion || f.institucionDestacada) {
    suscribe.push(texto(` perteneciente al ${f.institucion}${f.institucionDestacada ? ' ' : ''}`));
    if (f.institucionDestacada) suscribe.push({ texto: f.institucionDestacada, negrita: true });
  }
  suscribe.push(texto('.'));

  // 2. Hago constar
  let constar = `Por medio de la presente hago constar que ${sustantivo}, ${c.estudianteNombre.trim()}`;
  if (edad !== null) constar += `, de ${edad} ${edad === 1 ? 'año' : 'años'} de edad`;
  if (c.estudianteCedula.trim()) {
    constar += `, ${fem ? 'portadora' : 'portador'} de la Cédula de Identidad N° ${c.estudianteCedula.trim()}`;
  }
  if (c.escolaridadGrado.trim()) {
    constar +=
      c.escolaridadSituacion === 'proximo'
        ? `, y ${fem ? 'próxima' : 'próximo'} a cursar el ${c.escolaridadGrado.trim()}`
        : `, y cursante del ${c.escolaridadGrado.trim()}`;
    if (c.escolaridadAnioLectivo.trim()) {
      constar += ` durante el año lectivo ${c.escolaridadAnioLectivo.trim()}`;
    }
  }
  constar += ', es miembro activo y regular de nuestra institución, ';
  constar += c.instrumento.trim()
    ? `desempeñándose en la fila de ${c.instrumento.trim()} en la agrupación ${agrupacion}.`
    : `integrando la agrupación ${agrupacion}.`;

  // 3. Según el tipo
  const asimismo = `Asimismo, se hace constar que ${integrante} `;
  const nombreEvento = c.eventoNombre.trim() ? ` «${c.eventoNombre.trim()}»` : '';
  const lugar = c.lugar.trim() ? `, en ${c.lugar.trim()}` : '';
  let especifico = '';
  let tabla: FilaHorario[] | null = null;

  switch (c.tipo) {
    case 'horario': {
      const periodo = c.escolaridadAnioLectivo.trim() ? ' del mencionado periodo' : '';
      especifico =
        'Asimismo, se certifica y hace de conocimiento de las autoridades competentes que, ' +
        'para el cabal cumplimiento de su formación musical y su participación en los ensayos ' +
        `generales, seccionales y compromisos artísticos${periodo}, ${integrante} deberá regirse ` +
        'de manera estricta por el siguiente esquema de horarios:';
      tabla = c.horario;
      break;
    }
    case 'pertenencia': {
      const desde = c.fechaIngreso ? ` desde el ${fechaLarga(c.fechaIngreso)}` : '';
      especifico =
        `${asimismo}forma parte de esta agrupación${desde}, participando de manera regular ` +
        'en sus ensayos, actividades formativas y compromisos artísticos.';
      break;
    }
    case 'concierto': {
      const cuando = `el día ${fechaConDia(c.fecha)}${textoHorario(c, false)}${lugar}`;
      const t = tiempoDe(c.fecha, '', fechaEmision);
      especifico =
        t === 'futuro'
          ? `${asimismo}participará en el concierto${nombreEvento} a realizarse ${cuando}.`
          : t === 'presente'
            ? `${asimismo}participa en el concierto${nombreEvento} que se realiza ${cuando}.`
            : `${asimismo}participó en el concierto${nombreEvento} realizado ${cuando}.`;
      break;
    }
    case 'ensayo': {
      const cuando = `el día ${fechaConDia(c.fecha)}${textoHorario(c, false)}${lugar}`;
      const t = tiempoDe(c.fecha, '', fechaEmision);
      especifico =
        t === 'futuro'
          ? `${asimismo}deberá asistir al ensayo de la agrupación pautado para ${cuando}.`
          : t === 'presente'
            ? `${asimismo}asiste al ensayo de la agrupación que se realiza ${cuando}.`
            : `${asimismo}asistió al ensayo de la agrupación realizado ${cuando}.`;
      break;
    }
    case 'jornada': {
      const variosDias = !!c.fechaFin && c.fechaFin !== c.fecha;
      const rango = variosDias
        ? `desde el ${fechaConDia(c.fecha)} hasta el ${fechaConDia(c.fechaFin)}`
        : `el día ${fechaConDia(c.fecha)}`;
      const cuando = `${rango}${textoHorario(c, variosDias)}${lugar}`;
      const t = tiempoDe(c.fecha, variosDias ? c.fechaFin : '', fechaEmision);
      especifico =
        t === 'futuro'
          ? `${asimismo}participará en la jornada de ensayos${nombreEvento} a realizarse ${cuando}.`
          : t === 'presente'
            ? `${asimismo}se encuentra participando en la jornada de ensayos${nombreEvento} que se realiza ${cuando}.`
            : `${asimismo}participó en la jornada de ensayos${nombreEvento} realizada ${cuando}.`;
      break;
    }
  }

  const adicionales = (c.parrafoAdicional ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => [texto(p)]);

  return {
    lugarYFecha: [f.ciudad, fechaLarga(fechaEmision)].filter(Boolean).join(', '),
    destinatario: c.destinatario.trim()
      ? [...c.destinatario.trim().split('\n'), 'Su despacho. -']
      : ['A quien pueda interesar'],
    parrafos: [suscribe, [texto(constar)], [texto(especifico)]],
    tabla,
    parrafosFinales: [
      ...adicionales,
      [texto(`Constancia que se expide a petición de la parte interesada, ${fechaEnLetras(fechaEmision)}.`)],
    ],
    despedida: 'Sin más a que hacer referencia, me despido; atentamente:',
  };
}
