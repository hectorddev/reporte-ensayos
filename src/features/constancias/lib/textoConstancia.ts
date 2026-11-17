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

function diaSemana(iso: string): string {
  const { anio, mes, dia } = partes(iso);
  return DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
}

/** sábado 17 de octubre de 2026 */
export function fechaConDia(iso: string): string {
  if (!iso) return '';
  return `${diaSemana(iso)} ${fechaLarga(iso)}`;
}

/** ¿La actividad dura más de un día? (último día posterior al primero) */
export function esVariosDias(d: { fecha: string; fechaFin: string }): boolean {
  return !!d.fecha && !!d.fechaFin && d.fechaFin > d.fecha;
}

/**
 * «del viernes 13 al domingo 15 de noviembre de 2026»; el mes y el año solo se
 * repiten si cambian: «del sábado 31 de octubre al domingo 1 de noviembre de 2026».
 */
export function rangoFechas(inicio: string, fin: string): string {
  const a = partes(inicio);
  const b = partes(fin);
  const desde =
    a.anio !== b.anio
      ? fechaConDia(inicio)
      : a.mes !== b.mes
        ? `${diaSemana(inicio)} ${a.dia} de ${MESES[a.mes - 1]}`
        : `${diaSemana(inicio)} ${a.dia}`;
  return `del ${desde} al ${fechaConDia(fin)}`;
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
  if (c.horaInicio) return `, a partir de ${conArticulo(c.horaInicio)}${diario ? ' cada día' : ''}`;
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

type Articulo = 'el' | 'la' | 'los' | 'las';

/** Cómo se nombra la actividad si no tiene nombre propio: «el concierto». */
interface Generico {
  articulo: Articulo;
  sustantivo: string;
  /** Solo sin nombre: «el ensayo de la agrupación». */
  complemento?: string;
}

/** Palabras con que suele empezar el nombre de una actividad (sin tildes). */
const SUSTANTIVOS_EVENTO: Record<string, Articulo> = {
  concierto: 'el', conciertos: 'los', ensayo: 'el', ensayos: 'los', jornada: 'la', jornadas: 'las',
  encuentro: 'el', encuentros: 'los', festival: 'el', gira: 'la', campamento: 'el', taller: 'el',
  talleres: 'los', intensivo: 'el', temporada: 'la', gala: 'la', muestra: 'la', presentacion: 'la',
  presentaciones: 'las', montaje: 'el', clase: 'la', clases: 'las', seminario: 'el', curso: 'el',
  recital: 'el', concurso: 'el', audicion: 'la', audiciones: 'las', retiro: 'el', convivencia: 'la',
  congreso: 'el', foro: 'el', programa: 'el', proyecto: 'el', semana: 'la', certamen: 'el',
};

/** Palabras que pueden ir antes: «I Encuentro», «Gran Concierto», «Primera Jornada». */
const ANTES_DEL_SUSTANTIVO = /^([ivxlc]+|\d+\s*(er|ro|do|to|vo|no|mo|°|º|ª)?\.?|gran|primer|primera|segundo|segunda|tercer|tercera|cuarto|cuarta|quinto|quinta|nuevo|nueva)$/;

function sinTildes(palabra: string): string {
  return palabra.toLocaleLowerCase('es').normalize('NFD').replace(/\p{M}/gu, '');
}

/** «Encuentro Regional de Orquestas» → «el»; si el nombre no dice qué es, null. */
function articuloDelNombre(nombre: string): Articulo | null {
  const palabras = nombre.split(/\s+/).map(sinTildes);
  for (const palabra of palabras.slice(0, 2)) {
    if (SUSTANTIVOS_EVENTO[palabra]) return SUSTANTIVOS_EVENTO[palabra];
    if (!ANTES_DEL_SUSTANTIVO.test(palabra)) return null;
  }
  return null;
}

/** «realizado» → «realizada», «realizados»… según lo que se nombra. */
function concordar(participio: string, articulo: Articulo): string {
  const raiz = participio.slice(0, -1);
  return { el: `${raiz}o`, la: `${raiz}a`, los: `${raiz}os`, las: `${raiz}as` }[articulo];
}

/**
 * «participó en» + la actividad + resto de la frase, donde `resto` recibe el
 * artículo para concordar («realizado», «realizada», «se realizan»). Si el
 * nombre ya dice qué es («Encuentro Regional…») no se antepone el genérico:
 * «participó en el ENCUENTRO REGIONAL…» y no «en el concierto ENCUENTRO…».
 * «a el» se contrae en «al».
 */
function conEvento(inicio: string, generico: Generico, nombre: string, resto: (a: Articulo) => string): Parrafo {
  const propio = nombre ? articuloDelNombre(nombre) : null;
  const articulo = propio ?? generico.articulo;
  const enlace = `${inicio} ${articulo}`.replace(/\ba el$/, 'al');
  if (!nombre) return [texto(`${enlace} ${generico.sustantivo}${generico.complemento ?? ''}${resto(articulo)}`)];
  return [
    texto(propio ? `${enlace} ` : `${enlace} ${generico.sustantivo} `),
    negrita(nombre.toUpperCase()),
    texto(resto(articulo)),
  ];
}

const plural = (a: Articulo) => a === 'los' || a === 'las';

/**
 * Concierto, jornada o ensayo, de uno o varios días. El tiempo verbal depende de
 * la fecha de emisión: «participará en el ENCUENTRO REGIONAL DE ORQUESTAS a
 * realizarse del viernes 13 al domingo 15 de noviembre de 2026, en el horario
 * diario comprendido entre las 8:00 am y las 5:00 pm, en …».
 */
function parrafoEvento(c: DatosDocumento, elCual: string, fechaEmision: string): Parrafo {
  const varios = esVariosDias(c);
  const fechas = varios ? rangoFechas(c.fecha, c.fechaFin) : `el día ${fechaConDia(c.fecha)}`;
  const lugar = c.lugar.trim() ? `, en ${c.lugar.trim()}` : '';
  const cuando = `${fechas}${textoHorario(c, varios)}${lugar}.`;
  const t = tiempoDe(c.fecha, varios ? c.fechaFin : '', fechaEmision);
  const nombre = c.eventoNombre.trim();
  const seRealiza = (a: Articulo) => ` que se ${plural(a) ? 'realizan' : 'realiza'} ${cuando}`;
  const realizado = (a: Articulo) => ` ${concordar('realizado', a)} ${cuando}`;

  if (c.tipo === 'ensayo') {
    const generico: Generico = varios
      ? { articulo: 'los', sustantivo: 'ensayos', complemento: ' de la agrupación' }
      : { articulo: 'el', sustantivo: 'ensayo', complemento: ' de la agrupación' };
    if (t === 'futuro') {
      const pautado = (a: Articulo) => ` ${concordar('pautado', a)} ${varios ? '' : 'para '}${cuando}`;
      return conEvento(`${elCual} deberá asistir a`, generico, nombre, pautado);
    }
    if (t === 'presente') return conEvento(`${elCual} asiste a`, generico, nombre, seRealiza);
    return conEvento(`${elCual} asistió a`, generico, nombre, realizado);
  }

  let generico: Generico = { articulo: 'el', sustantivo: 'concierto' };
  if (c.tipo === 'jornada') generico = { articulo: 'la', sustantivo: 'jornada de ensayos' };
  else if (varios) generico = { articulo: 'los', sustantivo: 'conciertos' };

  if (t === 'futuro') return conEvento(`${elCual} participará en`, generico, nombre, () => ` a realizarse ${cuando}`);
  if (t === 'presente') {
    return conEvento(`${elCual} ${varios ? 'se encuentra participando' : 'participa'} en`, generico, nombre, seRealiza);
  }
  return conEvento(`${elCual} participó en`, generico, nombre, realizado);
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
    case 'concierto':
    case 'jornada':
    case 'ensayo':
      especifico = parrafoEvento(c, elCual, fechaEmision);
      break;
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
