import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function listarObras(_req: Request, res: Response) {
  const obras = await prisma.obra.findMany({ orderBy: { titulo: 'asc' } });
  res.json(obras);
}
