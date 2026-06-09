export interface Agrupacion {
  id: string;
  codigo: string;
  nombre: string;
}

export interface Matricula {
  ninos: number;
  ninas: number;
  adolescentesFemeninas: number;
  adolescentesMasculinos: number;
  adultosFemeninos: number;
  adultosMasculinos: number;
}

export interface ReporteMensualFormData {
  agrupacionId: string;
  anio: number;
  mes: number;
  fechasEnsayos: string[];
  temasRepertorio: string[];
  matricula: Matricula;
  observaciones: string;
}

export interface Ensayo {
  id: string;
  fecha: string;
}

export interface ReporteMensualGuardado {
  id: string;
  agrupacionId: string;
  anio: number;
  mes: number;
  totalNinos: number;
  totalNinas: number;
  totalAdolescentesFemeninas: number;
  totalAdolescentesMasculinos: number;
  totalAdultosFemeninos: number;
  totalAdultosMasculinos: number;
  repertorioTexto: string | null;
  observaciones: string | null;
  cerrado: boolean;
  createdAt: string;
  agrupacion: Agrupacion;
  ensayos: Ensayo[];
}

export interface ReporteMensualResponse {
  reporte: ReporteMensualGuardado;
  matriculaGuardada: Matricula & { totalActivos: number };
  mensaje: string;
}

export const MATRICULA_VACIA: Matricula = {
  ninos: 0,
  ninas: 0,
  adolescentesFemeninas: 0,
  adolescentesMasculinos: 0,
  adultosFemeninos: 0,
  adultosMasculinos: 0,
};

export const CATEGORIAS_DEMOGRAFICAS = [
  { key: 'ninos' as const, label: 'Niños', campo: 'totalNinos' as const },
  { key: 'ninas' as const, label: 'Niñas', campo: 'totalNinas' as const },
  { key: 'adolescentesFemeninas' as const, label: 'Adolescentes Femeninas', campo: 'totalAdolescentesFemeninas' as const },
  { key: 'adolescentesMasculinos' as const, label: 'Adolescentes Masculinos', campo: 'totalAdolescentesMasculinos' as const },
  { key: 'adultosFemeninos' as const, label: 'Adultos Femeninos', campo: 'totalAdultosFemeninos' as const },
  { key: 'adultosMasculinos' as const, label: 'Adultos Masculinos', campo: 'totalAdultosMasculinos' as const },
];

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function totalMatricula(matricula: Matricula): number {
  return (
    matricula.ninos +
    matricula.ninas +
    matricula.adolescentesFemeninas +
    matricula.adolescentesMasculinos +
    matricula.adultosFemeninos +
    matricula.adultosMasculinos
  );
}

export function totalDesdeReporte(reporte: ReporteMensualGuardado): number {
  return (
    reporte.totalNinos +
    reporte.totalNinas +
    reporte.totalAdolescentesFemeninas +
    reporte.totalAdolescentesMasculinos +
    reporte.totalAdultosFemeninos +
    reporte.totalAdultosMasculinos
  );
}

export function parseTemasRepertorio(texto: string | null): string[] {
  if (!texto?.trim()) return [];
  return texto.split('\n').map((t) => t.trim()).filter(Boolean);
}

export function formatFechaIso(fecha: string): string {
  const d = new Date(fecha);
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const anio = d.getUTCFullYear();
  return `${dia}/${mes}/${anio}`;
}

export function ensayoAFechaIso(fecha: string): string {
  const d = new Date(fecha);
  const anio = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/**
 * Compacta una lista de fechas de ensayo: solo los días, y la última de cada
 * mes lleva el sufijo -MM-AAAA. Ej: ['2026-06-01','2026-06-25'] -> "01, 25-06-2026".
 * Si hay varios meses, agrupa por mes-año.
 */
export function fechasEnsayoCompactas(fechas: string[]): string {
  const ordenadas = fechas
    .map((f) => ensayoAFechaIso(f)) // normaliza a AAAA-MM-DD
    .filter(Boolean)
    .sort();

  const grupos: { anio: string; mes: string; dias: string[] }[] = [];
  for (const f of ordenadas) {
    const [anio, mes, dia] = f.split('-');
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.anio === anio && ultimo.mes === mes) {
      ultimo.dias.push(dia);
    } else {
      grupos.push({ anio, mes, dias: [dia] });
    }
  }

  return grupos
    .map((g) =>
      g.dias
        .map((dia, i) => (i === g.dias.length - 1 ? `${dia}-${g.mes}-${g.anio}` : dia))
        .join(', ')
    )
    .join(', ');
}

export function reporteToFormData(reporte: ReporteMensualGuardado): ReporteMensualFormData {
  return {
    agrupacionId: reporte.agrupacionId,
    anio: reporte.anio,
    mes: reporte.mes,
    fechasEnsayos: reporte.ensayos.map((e) => ensayoAFechaIso(e.fecha)),
    temasRepertorio: parseTemasRepertorio(reporte.repertorioTexto),
    matricula: {
      ninos: reporte.totalNinos,
      ninas: reporte.totalNinas,
      adolescentesFemeninas: reporte.totalAdolescentesFemeninas,
      adolescentesMasculinos: reporte.totalAdolescentesMasculinos,
      adultosFemeninos: reporte.totalAdultosFemeninos,
      adultosMasculinos: reporte.totalAdultosMasculinos,
    },
    observaciones: reporte.observaciones ?? '',
  };
}
