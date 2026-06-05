import {
  CategoriaDemografica,
  EstatusMatricula,
} from '@prisma/client';
import { prisma } from '../lib/prisma';

const VENTANA_DIAS = 28;
const UMBRAL_ASISTENCIA = 0.5;

export interface EstudianteConEstatus {
  estudianteId: string;
  nombre: string;
  apellido: string;
  categoriaDemografica: CategoriaDemografica;
  estatus: EstatusMatricula;
  ensayosEnVentana: number;
  asistenciasEnVentana: number;
  porcentajeAsistencia: number;
}

export interface DemografiaActiva {
  ninos: number;
  ninas: number;
  adolescentesFemeninas: number;
  adolescentesMasculinos: number;
  adultosFemeninos: number;
  adultosMasculinos: number;
  totalActivos: number;
}

export async function calcularEstatusEstudiantes(
  agrupacionId: string,
  fechaReferencia: Date = new Date()
): Promise<EstudianteConEstatus[]> {
  const fechaInicio = new Date(fechaReferencia);
  fechaInicio.setHours(0, 0, 0, 0);
  fechaInicio.setDate(fechaInicio.getDate() - VENTANA_DIAS);

  const fechaFin = new Date(fechaReferencia);
  fechaFin.setHours(23, 59, 59, 999);

  const ensayosVentana = await prisma.ensayo.findMany({
    where: {
      agrupacionId,
      fecha: { gte: fechaInicio, lte: fechaFin },
    },
    select: { id: true },
  });

  const ensayoIds = ensayosVentana.map((e) => e.id);
  const totalEnsayos = ensayoIds.length;

  const estudiantes = await prisma.estudiante.findMany({
    where: { agrupacionId, activoEnSistema: true },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      categoriaDemografica: true,
      asistencias: {
        where: {
          ensayoId: { in: ensayoIds },
          presente: true,
        },
        select: { id: true },
      },
    },
  });

  return estudiantes.map((est) => {
    const asistencias = est.asistencias.length;
    const porcentaje = totalEnsayos > 0 ? asistencias / totalEnsayos : 0;
    const estatus: EstatusMatricula =
      totalEnsayos > 0 && porcentaje >= UMBRAL_ASISTENCIA
        ? EstatusMatricula.ACTIVO
        : EstatusMatricula.INACTIVO;

    return {
      estudianteId: est.id,
      nombre: est.nombre,
      apellido: est.apellido,
      categoriaDemografica: est.categoriaDemografica,
      estatus,
      ensayosEnVentana: totalEnsayos,
      asistenciasEnVentana: asistencias,
      porcentajeAsistencia: Math.round(porcentaje * 100),
    };
  });
}

export async function calcularDemografiaActiva(
  agrupacionId: string,
  fechaReferencia: Date = new Date()
): Promise<DemografiaActiva> {
  const estudiantes = await calcularEstatusEstudiantes(agrupacionId, fechaReferencia);
  const activos = estudiantes.filter((e) => e.estatus === EstatusMatricula.ACTIVO);

  const contar = (cat: CategoriaDemografica) =>
    activos.filter((e) => e.categoriaDemografica === cat).length;

  return {
    ninos: contar(CategoriaDemografica.NINOS),
    ninas: contar(CategoriaDemografica.NINAS),
    adolescentesFemeninas: contar(CategoriaDemografica.ADOLESCENTE_FEMENINA),
    adolescentesMasculinos: contar(CategoriaDemografica.ADOLESCENTE_MASCULINO),
    adultosFemeninos: contar(CategoriaDemografica.ADULTO_FEMENINO),
    adultosMasculinos: contar(CategoriaDemografica.ADULTO_MASCULINO),
    totalActivos: activos.length,
  };
}
