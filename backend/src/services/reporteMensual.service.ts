import { prisma } from '../lib/prisma';

export interface MatriculaPayload {
  ninos: number;
  ninas: number;
  adolescentesFemeninas: number;
  adolescentesMasculinos: number;
  adultosFemeninos: number;
  adultosMasculinos: number;
}

export interface ReporteMensualPayload {
  agrupacionId: string;
  anio: number;
  mes: number;
  fechasEnsayos: string[];
  temasRepertorio?: string[];
  matricula?: MatriculaPayload;
  observaciones?: string;
}

export function parseFecha(fecha: string): Date {
  const d = new Date(fecha);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function fechaToIso(fecha: Date): string {
  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const d = String(fecha.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizarMatricula(matricula?: MatriculaPayload): MatriculaPayload {
  return {
    ninos: Math.max(0, matricula?.ninos ?? 0),
    ninas: Math.max(0, matricula?.ninas ?? 0),
    adolescentesFemeninas: Math.max(0, matricula?.adolescentesFemeninas ?? 0),
    adolescentesMasculinos: Math.max(0, matricula?.adolescentesMasculinos ?? 0),
    adultosFemeninos: Math.max(0, matricula?.adultosFemeninos ?? 0),
    adultosMasculinos: Math.max(0, matricula?.adultosMasculinos ?? 0),
  };
}

export function totalMatricula(matricula: MatriculaPayload): number {
  return (
    matricula.ninos +
    matricula.ninas +
    matricula.adolescentesFemeninas +
    matricula.adolescentesMasculinos +
    matricula.adultosFemeninos +
    matricula.adultosMasculinos
  );
}

export function validarPayload(payload: ReporteMensualPayload): string | null {
  if (!payload.agrupacionId || !payload.anio || !payload.mes) {
    return 'agrupacionId, anio y mes son requeridos';
  }
  if (!payload.fechasEnsayos?.length) {
    return 'Debe registrar al menos una fecha de ensayo';
  }
  if (totalMatricula(normalizarMatricula(payload.matricula)) === 0) {
    return 'La matrícula debe tener al menos un integrante';
  }
  return null;
}

const reporteInclude = {
  agrupacion: true,
  ensayos: { orderBy: { fecha: 'asc' as const } },
};

export async function guardarReporteMensual(
  payload: ReporteMensualPayload,
  reporteId?: string
) {
  const matricula = normalizarMatricula(payload.matricula);
  const repertorioTexto = payload.temasRepertorio?.length
    ? payload.temasRepertorio.join('\n')
    : null;

  const datosBase = {
    agrupacionId: payload.agrupacionId,
    anio: payload.anio,
    mes: payload.mes,
    repertorioTexto,
    observaciones: payload.observaciones ?? null,
    totalNinos: matricula.ninos,
    totalNinas: matricula.ninas,
    totalAdolescentesFemeninas: matricula.adolescentesFemeninas,
    totalAdolescentesMasculinos: matricula.adolescentesMasculinos,
    totalAdultosFemeninos: matricula.adultosFemeninos,
    totalAdultosMasculinos: matricula.adultosMasculinos,
    cerrado: true,
  };

  return prisma.$transaction(async (tx) => {
    let reporte;

    if (reporteId) {
      const existente = await tx.reporteMensual.findUnique({
        where: { id: reporteId },
        include: { ensayos: true },
      });

      if (!existente) throw new Error('REPORTE_NO_ENCONTRADO');

      const duplicado = await tx.reporteMensual.findFirst({
        where: {
          agrupacionId: payload.agrupacionId,
          anio: payload.anio,
          mes: payload.mes,
          NOT: { id: reporteId },
        },
      });

      if (duplicado) throw new Error('REPORTE_DUPLICADO');

      reporte = await tx.reporteMensual.update({
        where: { id: reporteId },
        data: datosBase,
      });

      const fechasNuevas = new Set(payload.fechasEnsayos.map(parseFecha).map(fechaToIso));
      const ensayosActuales = existente.ensayos;

      for (const ensayo of ensayosActuales) {
        const iso = fechaToIso(ensayo.fecha);
        if (!fechasNuevas.has(iso)) {
          await tx.ensayo.update({
            where: { id: ensayo.id },
            data: { reporteMensualId: null },
          });
        }
      }

      for (const fechaStr of payload.fechasEnsayos) {
        const fecha = parseFecha(fechaStr);
        await tx.ensayo.upsert({
          where: {
            agrupacionId_fecha: {
              agrupacionId: payload.agrupacionId,
              fecha,
            },
          },
          create: {
            agrupacionId: payload.agrupacionId,
            fecha,
            reporteMensualId: reporte.id,
          },
          update: {
            reporteMensualId: reporte.id,
            agrupacionId: payload.agrupacionId,
          },
        });
      }
    } else {
      reporte = await tx.reporteMensual.upsert({
        where: {
          agrupacionId_anio_mes: {
            agrupacionId: payload.agrupacionId,
            anio: payload.anio,
            mes: payload.mes,
          },
        },
        create: datosBase,
        update: datosBase,
      });

      for (const fechaStr of payload.fechasEnsayos) {
        const fecha = parseFecha(fechaStr);
        await tx.ensayo.upsert({
          where: {
            agrupacionId_fecha: {
              agrupacionId: payload.agrupacionId,
              fecha,
            },
          },
          create: {
            agrupacionId: payload.agrupacionId,
            fecha,
            reporteMensualId: reporte.id,
          },
          update: { reporteMensualId: reporte.id },
        });
      }
    }

    return tx.reporteMensual.findUnique({
      where: { id: reporte.id },
      include: reporteInclude,
    });
  });
}

export async function eliminarReporteMensual(reporteId: string) {
  return prisma.$transaction(async (tx) => {
    const reporte = await tx.reporteMensual.findUnique({
      where: { id: reporteId },
      include: { ensayos: true },
    });

    if (!reporte) throw new Error('REPORTE_NO_ENCONTRADO');

    for (const ensayo of reporte.ensayos) {
      await tx.ensayo.update({
        where: { id: ensayo.id },
        data: { reporteMensualId: null },
      });
    }

    await tx.reporteMensual.delete({ where: { id: reporteId } });
    return reporte;
  });
}

export { reporteInclude };
