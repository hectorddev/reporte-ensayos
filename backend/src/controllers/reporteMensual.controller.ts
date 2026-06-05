import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  guardarReporteMensual,
  eliminarReporteMensual,
  reporteInclude,
  totalMatricula,
  normalizarMatricula,
  validarPayload,
  type ReporteMensualPayload,
} from '../services/reporteMensual.service';

export async function crearReporteMensual(req: Request, res: Response) {
  const payload: ReporteMensualPayload = req.body;
  const errorValidacion = validarPayload(payload);

  if (errorValidacion) {
    return res.status(400).json({ error: errorValidacion });
  }

  try {
    const reporteFinal = await guardarReporteMensual(payload);
    const matricula = normalizarMatricula(payload.matricula);

    return res.status(201).json({
      reporte: reporteFinal,
      matriculaGuardada: {
        ...matricula,
        totalActivos: totalMatricula(matricula),
      },
      mensaje: 'Reporte mensual guardado correctamente',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al procesar reporte mensual' });
  }
}

export async function listarReportes(req: Request, res: Response) {
  const { agrupacionId, anio, mes } = req.query;

  const reportes = await prisma.reporteMensual.findMany({
    where: {
      ...(agrupacionId ? { agrupacionId: agrupacionId as string } : {}),
      ...(anio ? { anio: Number(anio) } : {}),
      ...(mes ? { mes: Number(mes) } : {}),
    },
    include: reporteInclude,
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
  });

  res.json(reportes);
}

export async function obtenerReporte(req: Request, res: Response) {
  const { id } = req.params;

  const reporte = await prisma.reporteMensual.findUnique({
    where: { id },
    include: reporteInclude,
  });

  if (!reporte) {
    return res.status(404).json({ error: 'Reporte no encontrado' });
  }

  res.json(reporte);
}

export async function actualizarReporte(req: Request, res: Response) {
  const { id } = req.params;
  const payload: ReporteMensualPayload = req.body;
  const errorValidacion = validarPayload(payload);

  if (errorValidacion) {
    return res.status(400).json({ error: errorValidacion });
  }

  try {
    const reporteFinal = await guardarReporteMensual(payload, id);
    const matricula = normalizarMatricula(payload.matricula);

    return res.json({
      reporte: reporteFinal,
      matriculaGuardada: {
        ...matricula,
        totalActivos: totalMatricula(matricula),
      },
      mensaje: 'Reporte actualizado correctamente',
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : '';

    if (mensaje === 'REPORTE_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }
    if (mensaje === 'REPORTE_DUPLICADO') {
      return res.status(409).json({
        error: 'Ya existe otro reporte para esa agrupación en el mismo mes y año',
      });
    }

    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar reporte' });
  }
}

export async function eliminarReporte(req: Request, res: Response) {
  const { id } = req.params;

  try {
    await eliminarReporteMensual(id);
    return res.json({ mensaje: 'Reporte eliminado correctamente' });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : '';

    if (mensaje === 'REPORTE_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Error al eliminar reporte' });
  }
}
