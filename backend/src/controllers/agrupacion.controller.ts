import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  calcularDemografiaActiva,
  calcularEstatusEstudiantes,
} from '../services/matriculaActiva.service';

export async function listarAgrupaciones(_req: Request, res: Response) {
  const agrupaciones = await prisma.agrupacion.findMany({
    where: { activa: true },
    orderBy: { nombre: 'asc' },
  });
  res.json(agrupaciones);
}

export async function obtenerEstudiantes(req: Request, res: Response) {
  const { agrupacionId } = req.params;
  const estudiantes = await prisma.estudiante.findMany({
    where: { agrupacionId, activoEnSistema: true },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
  res.json(estudiantes);
}

export async function previewDemografiaActiva(req: Request, res: Response) {
  const { agrupacionId } = req.params;
  const { fechaReferencia } = req.query;

  const fecha = fechaReferencia ? new Date(fechaReferencia as string) : new Date();
  const [demografia, estudiantes] = await Promise.all([
    calcularDemografiaActiva(agrupacionId, fecha),
    calcularEstatusEstudiantes(agrupacionId, fecha),
  ]);

  res.json({ demografia, estudiantes });
}
