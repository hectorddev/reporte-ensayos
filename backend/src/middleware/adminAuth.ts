import { Request, Response, NextFunction } from 'express';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const password = req.header('X-Admin-Password');

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Acceso de administrador no autorizado' });
  }

  next();
}

export function loginAdmin(req: Request, res: Response) {
  const { password } = req.body;

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  res.json({ ok: true, mensaje: 'Sesión de administrador iniciada' });
}
