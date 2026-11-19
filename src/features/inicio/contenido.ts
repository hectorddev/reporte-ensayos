/**
 * Contenido de la página de inicio, tomado de las láminas institucionales del
 * núcleo (julio 2026). Para actualizar cifras o textos, edita solo este archivo.
 * Sin nombres de personas ni fotos de estudiantes: solo cargos y datos generales.
 */

import { MODULOS_PSB } from '../../lib/datosEstaticos';

export const NUCLEO = {
  nombre: 'Núcleo Palmira I',
  lema: 'Semillero de talentos',
  sistema: 'El Sistema Nacional de Orquestas y Coros Juveniles e Infantiles de Venezuela',
  codigo: 'GE-TA-023-0012',
  ubicacionCorta: 'Palmira, Mcpio. Guásimos — Táchira',
  adscripcion: 'Gerencia Estadal Táchira — FundaMusical Bolívar',
  telefono: '0276-3945614',
  correo: 'nucleo.palmira1@elsistema.org.ve',
  mapa: 'https://maps.app.goo.gl/cNwz6pcV1PgqFBBb7',
};

export const SEDES = [
  {
    titulo: 'Sede principal',
    direccion: 'Calle 1 esquina carrera 6, Palmira, municipio Guásimos, estado Táchira (Ateneo de Palmira).',
  },
  {
    titulo: 'Aulas anexas',
    direccion: 'Carrera 2 entre calles 2 y 3, sector Los Alegres. En funciones desde septiembre de 2023.',
  },
];

/** Fecha de corte de las cifras: se muestra junto a ellas. */
export const FECHA_CIFRAS = 'julio 2026';

export const CIFRAS = [
  { valor: '829', texto: 'niños, jóvenes y adultos alcanzados entre sede y módulos' },
  { valor: '233', texto: 'beneficiarios en la sede' },
  { valor: '596', texto: 'niños y niñas en los módulos escolares Simón Bolívar' },
  { valor: '18', texto: 'formadores integrales académicos musicales' },
];

export interface Programa {
  nombre: string;
  descripcion: string;
  /** Colores de la lámina de programas: texto (oscuro, legible) y barra. */
  color: string;
  barra: string;
}

export const PROGRAMAS: Programa[] = [
  {
    nombre: 'Nuevos integrantes',
    descripcion: 'Inicia a bebés, desde la etapa prenatal hasta los 3 años, en la música mediante la conexión familiar y la orquesta.',
    color: '#8b2f8c',
    barra: '#8b2f8c',
  },
  {
    nombre: 'Iniciación musical',
    descripcion:
      'Acerca a los niños al mundo orquestal y coral, estimulando la disciplina, la psicomotricidad y la atención al director. Orquesta Pequeños Mozart y Orquesta Sinfónica Pre Infantil Etapa 1.',
    color: '#8b2f8c',
    barra: '#8b2f8c',
  },
  {
    nombre: 'Orquestal',
    descripcion:
      'Práctica musical grupal e individual de instrumentos sinfónicos: violín, viola, cello, contrabajo, flauta transversa, oboe, clarinete, trombón y tuba. Orquesta Sinfónica Pre Infantil Etapa 2, Infantil y Juvenil.',
    color: '#8b1a10',
    barra: '#8b1a10',
  },
  {
    nombre: 'Alma Llanera',
    descripcion:
      'Celebra las tradiciones y el patrimonio musical venezolano con instrumentos típicos: mandolina, mandola, bandola llanera, bandolín tachirense, cuatro, guitarra y contrabajo, en niveles I, II y III.',
    color: '#6f5a00',
    barra: '#f5d10f',
  },
  {
    nombre: 'Coral',
    descripcion: 'Desarrolla la voz como instrumento de integración colectiva. Práctica coral y coro infantil.',
    color: '#46702a',
    barra: '#5e8a3a',
  },
  {
    nombre: 'Simón Bolívar',
    descripcion:
      'Lleva la práctica musical colectiva a las escuelas del municipio para masificar la enseñanza musical y sus valores.',
    color: '#b03d10',
    barra: '#e85a2a',
  },
];

export const HISTORIA = [
  {
    anio: '2001',
    texto:
      'Se firma el convenio entre la Fundación Orquesta Juvenil del Táchira y la Casa de la Cultura Ateneo Palmira. Nace la Orquesta Típica Juvenil de Palmira.',
  },
  { anio: '2005', texto: 'El módulo obtiene la categoría de núcleo y abre los programas típicos, sinfónicos y de canto.' },
  { anio: '2009', texto: 'Se conforma la Fundación Orquesta Sinfónica Juvenil e Infantil del Municipio Guásimos.' },
  { anio: '2012', texto: 'Se abre el módulo de Llano Grande, que alcanza la categoría de núcleo en 2018.' },
  { anio: '2018', texto: 'Se renuevan la dirección y la coordinación del núcleo.' },
  {
    anio: '2023',
    texto: 'Por el aumento de la matrícula entran en funciones las Aulas Anexas, en la Casa de las Misiones del sector Los Alegres.',
  },
];

export const PROYECCION =
  'El Ensamble de Cuerdas Pulsadas del núcleo representó a Palmira en Envigado (2010) y Duitama (2011), Colombia, y en el Festival de Plectro de Mirecourt, Francia (2012).';

/** Escuelas del Programa Simón Bolívar (el mismo catálogo que usan los informes). */
export const MODULOS_ESCOLARES = MODULOS_PSB.map((m) => m.nombre);

/** Estructura del núcleo en términos generales (sin nombres). */
export const EQUIPO = [
  {
    titulo: 'Dirección y coordinación',
    texto: 'Dirección de Núcleo, Coordinación de Núcleo y Coordinación de Plan y Seguimiento.',
  },
  {
    titulo: '18 formadores integrales académicos',
    texto: 'Alma Llanera (8), Orquestal (5), Iniciación (3) y Coral (2). Llevan la música a la sede y a los módulos.',
  },
  { titulo: 'Personal de apoyo y operativo', texto: 'Bienes, servicios generales, utilería y guía de centro.' },
  { titulo: 'Comité de Padres y Representantes', texto: 'Aliado permanente en las actividades cotidianas del núcleo.' },
  {
    titulo: 'Comisión de Protección y Prevención del Niño, Niña y Adolescente',
    texto: 'Vela por el resguardo de los estudiantes dentro y fuera de la sede.',
  },
];

export const CITA = {
  texto:
    'La orquesta y el coro son mucho más que estructuras artísticas. Son ejemplos y escuelas de vida social, porque cantar y tocar juntos significa convivir de manera íntima hacia la perfección y la excelencia, siguiendo una estricta disciplina de organización y coordinación. Así se construye el espíritu solidario y fraterno, y se cultivan los valores que forjan a un ciudadano integral.',
  autor: 'José Antonio Abreu, fundador de El Sistema',
};
