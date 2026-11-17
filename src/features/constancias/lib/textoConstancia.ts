import { NUCLEO, PARRAFOS_INSTITUCIONALES } from '../config';
import type { DatosSolicitud, FilaHorario, Firmante } from '../types/constancia.types';

/** Lo que necesita el texto: los datos de la solicitud + el párrafo de la coordinación. */
export type DatosDocumento = DatosSolicitud & { parrafoAdicional?: string };

/* ---------------- Fechas y horas ---------------- */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

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

/** Cierre del formato del núcleo: «a los 04 días del mes de Noviembre del 2026». */
export function fechaDespedida(iso: string): string {
  const { anio, mes, dia } = partes(iso);
  const nombreMes = MESES[mes - 1].charAt(0).toUpperCase() + MESES[mes - 1].slice(1);
  const dd = String(dia).padStart(2, '0');
  return `${dia === 1 ? `al ${dd} día` : `a los ${dd} días`} del mes de ${nombreMes} del ${anio}`;
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

/**
 * ¿Necesita representante? Sin fecha de nacimiento se asume que sí (la mayoría
 * de integrantes son niños y adolescentes).
 */
export function esMenorDeEdad(nacimiento: string, referencia: string = hoyIso()): boolean {
  const edad = calcularEdad(nacimiento, referencia);
  return edad === null || edad < 18;
}

/* ---------------- Contenido ---------------- */

export interface Segmento {
  texto: string;
  negrita?: boolean;
}
export type Parrafo = Segmento[];

export interface ContenidoConstancia {
  /** Vacío: la constancia no lleva bloque de destinatario. */
  destinatario: string[];
  titulo: string;
  parrafos: Parrafo[];
  tabla: FilaHorario[] | null;
  parrafosFinales: Parrafo[];
  despedida: string;
}

/**
 * Contenido largo (más de 2 días de horario, párrafo adicional, o tabla con
 * destinatario): se reduce el espacio de la firma para caber en una hoja.
 */
export function esCompacta(contenido: ContenidoConstancia): boolean {
  const filas = contenido.tabla?.length ?? 0;
  const conAdicional = contenido.parrafosFinales.length > PARRAFOS_INSTITUCIONALES.length + 1;
  return filas > 2 || conAdicional || (filas > 0 && contenido.destinatario.length > 0);
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

/**
 * Cédula con el mismo formato que la del firmante: «36944739», «V-36.944.739»
 * → «N° 36.944.739»; extranjeros «E-…» → «N° E-12.345.678». Si no es una
 * cédula de números (p. ej. un pasaporte) se respeta lo escrito.
 */
export function formatoCedula(cedula: string): string {
  const limpia = cedula.trim().replace(/^(n\s*[°º]|no\.?)\s*/i, '');
  if (!limpia) return '';
  const partes = /^([VvEe])?[\s.-]*(\d[\d.\s]*)$/.exec(limpia);
  if (!partes) return `N° ${limpia}`;
  const conPuntos = partes[2].replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `N° ${partes[1]?.toUpperCase() === 'E' ? 'E-' : ''}${conPuntos}`;
}

const PALABRAS_MENORES = new Set(['a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'los', 'o', 'para', 'por', 'u', 'y']);

/**
 * Mayúscula inicial en cada palabra de un nombre propio: «grupo escolar monseñor
 * san miguel» → «Grupo Escolar Monseñor San Miguel». Artículos y preposiciones
 * van en minúscula salvo al inicio, y lo escrito todo en mayúsculas (siglas
 * como U.E.) se respeta.
 */
export function nombrePropio(linea: string): string {
  let primera = true;
  return linea.replace(/\S+/g, (palabra) => {
    const esInicio = primera;
    primera = false;
    if (!/\p{Ll}/u.test(palabra)) return palabra;
    const minuscula = palabra.toLowerCase();
    if (!esInicio && PALABRAS_MENORES.has(minuscula)) return minuscula;
    return palabra.replace(/\p{L}/u, (letra) => letra.toUpperCase());
  });
}

const PARTICULAS_NOMBRE = new Set(['de', 'del', 'la', 'las', 'los', 'y']);

/**
 * Nombre de persona con la primera letra de cada palabra en mayúscula y el resto
 * en minúscula: «DAVIANA MÁRQUEZ» o «daviana márquez» → «Daviana Márquez».
 * «de», «del», «la»… quedan en minúscula: «María de los Ángeles».
 */
export function nombrePersona(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra, i) => {
      const minuscula = palabra.toLocaleLowerCase('es');
      if (i > 0 && PARTICULAS_NOMBRE.has(minuscula)) return minuscula;
      // También tras guion o apóstrofo: «Ana-María», «O'Connor».
      return minuscula.replace(/(^|[-'’])(\p{L})/gu, (_, antes: string, letra: string) => antes + letra.toLocaleUpperCase('es'));
    })
    .join(' ');
}

function texto(t: string): Segmento {
  return { texto: t };
}

function negrita(t: string): Segmento {
  return { texto: t, negrita: true };
}

/**
 * «participó en» + «el concierto» + nombre en negrita + resto de la frase. Si el
 * nombre ya empieza con la palabra («Concierto de Navidad») no se repite:
 * «participó en el CONCIERTO DE NAVIDAD». «a el» se contrae en «al».
 */
function conEvento(inicio: string, generico: string, nombre: string, sinNombre: string, fin: string): Parrafo {
  const contraer = (t: string) => t.replace(/\ba el\b/, 'al');
  if (!nombre) return [texto(contraer(`${inicio} ${generico}${sinNombre}${fin}`))];
  const [articulo, sustantivo] = generico.split(' ');
  const repite = nombre.toLowerCase().startsWith(sustantivo);
  return [texto(contraer(`${inicio} ${repite ? articulo : generico} `)), negrita(nombre.toUpperCase()), texto(fin)];
}

/**
 * Arma el texto de la constancia con el formato del núcleo. `fechaEmision`
 * define la edad, el tiempo verbal (un concierto posterior se redacta en
 * futuro) y la fecha del cierre.
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
  const elCual = fem ? 'La cual' : 'El cual';

  // 1. Quien suscribe
  const suscribe: Parrafo = [
    texto('Quien suscribe, '),
    negrita(f.nombre),
    texto(`, ${f.genero === 'F' ? 'portadora' : 'portador'} de la Cédula de Identidad `),
    negrita(`N° ${f.cedula}`),
  ];
  if (f.cargo) suscribe.push(texto(', actuando como '), negrita(f.cargo));
  if (f.institucion || f.institucionDestacada) {
    suscribe.push(texto(` perteneciente al ${f.institucion}${f.institucionDestacada ? ' ' : ''}`));
    if (f.institucionDestacada) suscribe.push(negrita(f.institucionDestacada));
  }
  suscribe.push(texto('.'));

  // 2. Hago constar (nombre y cédula del estudiante en negrita)
  const constar: Parrafo = [
    texto(`Por medio de la presente hago constar que ${sustantivo} `),
    negrita(nombrePersona(c.estudianteNombre)),
  ];
  const edadTexto = edad !== null ? `, de ${edad} ${edad === 1 ? 'año' : 'años'} de edad` : '';
  // Sin cédula (niños pequeños) la constancia lo indica con N/A en vez de omitirlo.
  constar.push(
    texto(`${edadTexto}, titular de la cédula de identidad `),
    negrita(formatoCedula(c.estudianteCedula) || 'N/A')
  );
  const instrumento = c.instrumento.trim();
  constar.push(
    texto(`, es ${fem ? 'integrante activa' : 'integrante activo'} ${instrumento ? `de la cátedra de ${instrumento} ` : ''}en la agrupación `),
    negrita(`“${c.agrupacionNombre.trim()}”`),
    texto(` del ${NUCLEO}.`)
  );

  // 3. Según el tipo
  const nombreEvento = c.eventoNombre.trim();
  const lugar = c.lugar.trim() ? `, en ${c.lugar.trim()}` : '';
  let especifico: Parrafo = [];
  let tabla: FilaHorario[] | null = null;

  switch (c.tipo) {
    case 'horario':
      especifico = [
        texto(
          'Asimismo, se certifica y hace de conocimiento de las autoridades competentes que, ' +
            'para el cabal cumplimiento de su formación musical y su participación en los ensayos ' +
            `generales, seccionales y compromisos artísticos, ${integrante} deberá regirse ` +
            'de manera estricta por el siguiente esquema de horarios:'
        ),
      ];
      tabla = c.horario;
      break;
    case 'pertenencia': {
      const desde = c.fechaIngreso ? ` desde el ${fechaLarga(c.fechaIngreso)}` : '';
      especifico = [
        texto(
          `${elCual} forma parte de la agrupación${desde}, participando de manera regular ` +
            'en sus ensayos, actividades formativas y compromisos artísticos.'
        ),
      ];
      break;
    }
    case 'concierto': {
      const cuando = `el día ${fechaConDia(c.fecha)}${textoHorario(c, false)}${lugar}.`;
      const t = tiempoDe(c.fecha, '', fechaEmision);
      especifico =
        t === 'futuro'
          ? conEvento(`${elCual} participará en`, 'el concierto', nombreEvento, '', ` a realizarse ${cuando}`)
          : t === 'presente'
            ? conEvento(`${elCual} participa en`, 'el concierto', nombreEvento, '', ` que se realiza ${cuando}`)
            : conEvento(`${elCual} participó en`, 'el concierto', nombreEvento, '', ` realizado ${cuando}`);
      break;
    }
    case 'ensayo': {
      const cuando = `el día ${fechaConDia(c.fecha)}${textoHorario(c, false)}${lugar}.`;
      const t = tiempoDe(c.fecha, '', fechaEmision);
      especifico =
        t === 'futuro'
          ? conEvento(`${elCual} deberá asistir a`, 'el ensayo', nombreEvento, ' de la agrupación', ` pautado para ${cuando}`)
          : t === 'presente'
            ? conEvento(`${elCual} asiste a`, 'el ensayo', nombreEvento, ' de la agrupación', ` que se realiza ${cuando}`)
            : conEvento(`${elCual} asistió a`, 'el ensayo', nombreEvento, ' de la agrupación', ` realizado ${cuando}`);
      break;
    }
    case 'jornada': {
      const variosDias = !!c.fechaFin && c.fechaFin !== c.fecha;
      const rango = variosDias
        ? `desde el ${fechaConDia(c.fecha)} hasta el ${fechaConDia(c.fechaFin)}`
        : `el día ${fechaConDia(c.fecha)}`;
      const cuando = `${rango}${textoHorario(c, variosDias)}${lugar}.`;
      const t = tiempoDe(c.fecha, variosDias ? c.fechaFin : '', fechaEmision);
      especifico =
        t === 'futuro'
          ? conEvento(`${elCual} participará en`, 'la jornada de ensayos', nombreEvento, '', ` a realizarse ${cuando}`)
          : t === 'presente'
            ? conEvento(`${elCual} se encuentra participando en`, 'la jornada de ensayos', nombreEvento, '', ` que se realiza ${cuando}`)
            : conEvento(`${elCual} participó en`, 'la jornada de ensayos', nombreEvento, '', ` realizada ${cuando}`);
      break;
    }
  }

  const adicionales = (c.parrafoAdicional ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => [texto(p)]);

  return {
    destinatario: c.destinatario.trim()
      ? [...c.destinatario.trim().split('\n').map(nombrePropio), 'Su despacho. -']
      : [],
    titulo: 'CONSTANCIA',
    parrafos: [suscribe, [texto('Reciban un Saludo deseándole éxito en sus funciones.')], constar, especifico],
    tabla,
    parrafosFinales: [
      ...adicionales,
      ...PARRAFOS_INSTITUCIONALES.map((p) => [texto(p)]),
      [texto(`Sin otro particular a que hacer referencia, se despide ${fechaDespedida(fechaEmision)}.`)],
    ],
    despedida: 'Atentamente,',
  };
}
