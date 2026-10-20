export type TipoConstancia = 'horario' | 'pertenencia' | 'concierto' | 'jornada' | 'ensayo';
export type EstadoConstancia = 'pendiente' | 'aprobada' | 'rechazada';
export type Genero = 'M' | 'F';
export type SituacionEscolar = 'cursa' | 'proximo';

export const TIPOS_CONSTANCIA: { id: TipoConstancia; titulo: string; descripcion: string }[] = [
  {
    id: 'horario',
    titulo: 'Horario de actividades',
    descripcion: 'Días y horas en que asiste a la agrupación (para el liceo o el trabajo).',
  },
  {
    id: 'pertenencia',
    titulo: 'Participación en agrupación',
    descripcion: 'Certifica que es integrante activo de una agrupación.',
  },
  {
    id: 'concierto',
    titulo: 'Asistencia a concierto',
    descripcion: 'Participación en un concierto o presentación.',
  },
  {
    id: 'jornada',
    titulo: 'Jornada de ensayos',
    descripcion: 'Varios días seguidos de ensayo (intensivo, campamento).',
  },
  {
    id: 'ensayo',
    titulo: 'Asistencia a un ensayo',
    descripcion: 'Un ensayo en una fecha específica.',
  },
];

export function tituloTipo(tipo: TipoConstancia): string {
  return TIPOS_CONSTANCIA.find((t) => t.id === tipo)?.titulo ?? tipo;
}

export const ESTADOS_CONSTANCIA: Record<EstadoConstancia, string> = {
  pendiente: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export interface FilaHorario {
  dia: string;
  horaInicio: string; // HH:MM
  horaFin: string;
  actividad: string;
}

/** Lo que llena el representante. Las fechas van en AAAA-MM-DD. */
export interface DatosSolicitud {
  tipo: TipoConstancia;
  representanteNombre: string;
  representanteCedula: string;
  representanteTelefono: string;
  estudianteNombre: string;
  estudianteCedula: string;
  estudianteGenero: Genero;
  estudianteFechaNacimiento: string;
  agrupacionId: string;
  agrupacionNombre: string;
  instrumento: string;
  escolaridadSituacion: SituacionEscolar;
  escolaridadGrado: string;
  escolaridadAnioLectivo: string;
  destinatario: string;
  // Horario
  horario: FilaHorario[];
  // Participación en agrupación
  fechaIngreso: string;
  // Concierto / jornada / ensayo
  eventoNombre: string;
  fecha: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  /** Nota para la coordinación; no se imprime. */
  notas: string;
}

/** Quien firma. Se copia en la constancia al aprobarla. */
export interface Firmante {
  nombre: string;
  genero: Genero;
  cedula: string;
  /** Como aparece en el texto: "fungiendo como …". */
  cargo: string;
  institucion: string;
  /** Parte de la institución que va en negrita, ej. FUNDAMUSICAL SIMÓN BOLÍVAR. */
  institucionDestacada: string;
  /** Línea bajo la firma. */
  cargoFirma: string;
  telefono: string;
  ciudad: string;
}

/** Lo que viaja en el enlace de WhatsApp del representante a la coordinación. */
export interface Solicitud extends DatosSolicitud {
  codigo: string;
  creadoEn: string; // ISO
}

/** representante: se le envía el PDF; coordinacion: la imprime y la entrega. */
export type EntregaConstancia = 'representante' | 'coordinacion';

/** Solicitud revisada por la coordinación. Se guarda solo en su navegador. */
export interface Constancia extends Solicitud {
  estado: EstadoConstancia;
  fechaEmision: string;
  parrafoAdicional: string;
  entrega: EntregaConstancia;
  motivoRechazo: string;
  actualizadoEn: string;
}

export const FILA_HORARIO_VACIA: FilaHorario = {
  dia: 'Lunes',
  horaInicio: '14:00',
  horaFin: '17:00',
  actividad: 'Ensayo General',
};

export const SOLICITUD_VACIA: DatosSolicitud = {
  tipo: 'horario',
  representanteNombre: '',
  representanteCedula: '',
  representanteTelefono: '',
  estudianteNombre: '',
  estudianteCedula: '',
  estudianteGenero: 'M',
  estudianteFechaNacimiento: '',
  agrupacionId: '',
  agrupacionNombre: '',
  instrumento: '',
  escolaridadSituacion: 'cursa',
  escolaridadGrado: '',
  escolaridadAnioLectivo: '',
  destinatario: '',
  horario: [FILA_HORARIO_VACIA],
  fechaIngreso: '',
  eventoNombre: '',
  fecha: '',
  fechaFin: '',
  horaInicio: '',
  horaFin: '',
  lugar: '',
  notas: '',
};

/** Vacía los campos que no aplican al tipo elegido (p. ej. tras cambiar de tipo). */
export function limpiarSegunTipo(d: DatosSolicitud): DatosSolicitud {
  const evento = d.tipo === 'concierto' || d.tipo === 'jornada' || d.tipo === 'ensayo';
  return {
    ...d,
    horario: d.tipo === 'horario' ? d.horario : [],
    fechaIngreso: d.tipo === 'pertenencia' ? d.fechaIngreso : '',
    eventoNombre: d.tipo === 'concierto' || d.tipo === 'jornada' ? d.eventoNombre : '',
    fecha: evento ? d.fecha : '',
    fechaFin: d.tipo === 'jornada' ? d.fechaFin : '',
    horaInicio: evento ? d.horaInicio : '',
    horaFin: evento ? d.horaFin : '',
    lugar: evento ? d.lugar : '',
  };
}

const MAX_TEXTO = 400;
const MAX_FILAS_HORARIO = 14;
const TIPOS_VALIDOS = new Set<string>(TIPOS_CONSTANCIA.map((t) => t.id));

function texto(v: unknown, porDefecto: string): string {
  return typeof v === 'string' ? v.slice(0, MAX_TEXTO) : porDefecto;
}

/**
 * Toma solo los campos conocidos de la solicitud, con su tipo correcto.
 * Sirve para separar datos de control y para sanear lo que llega en un enlace.
 */
export function datosDeSolicitud(origen: Record<string, unknown>): DatosSolicitud {
  const datos = { ...SOLICITUD_VACIA } as Record<string, unknown>;
  for (const [campo, porDefecto] of Object.entries(SOLICITUD_VACIA)) {
    if (typeof porDefecto === 'string') datos[campo] = texto(origen[campo], porDefecto);
  }
  if (!TIPOS_VALIDOS.has(String(datos.tipo))) datos.tipo = SOLICITUD_VACIA.tipo;
  if (datos.estudianteGenero !== 'F') datos.estudianteGenero = 'M';
  if (datos.escolaridadSituacion !== 'proximo') datos.escolaridadSituacion = 'cursa';

  const filas = Array.isArray(origen.horario) ? origen.horario : [];
  datos.horario = filas.slice(0, MAX_FILAS_HORARIO).map((f) => {
    const fila = (f ?? {}) as Record<string, unknown>;
    return {
      dia: texto(fila.dia, 'Lunes'),
      horaInicio: texto(fila.horaInicio, ''),
      horaFin: texto(fila.horaFin, ''),
      actividad: texto(fila.actividad, ''),
    };
  });
  return datos as unknown as DatosSolicitud;
}
