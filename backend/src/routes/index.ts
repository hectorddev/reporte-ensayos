import { Router } from 'express';
import {
  listarAgrupaciones,
  obtenerEstudiantes,
  previewDemografiaActiva,
} from '../controllers/agrupacion.controller';
import { listarObras } from '../controllers/obra.controller';
import {
  crearReporteMensual,
  listarReportes,
} from '../controllers/reporteMensual.controller';
import adminRoutes from './admin.routes';

const router = Router();

router.get('/agrupaciones', listarAgrupaciones);
router.get('/agrupaciones/:agrupacionId/estudiantes', obtenerEstudiantes);
router.get('/agrupaciones/:agrupacionId/demografia-activa', previewDemografiaActiva);

router.get('/obras', listarObras);

router.get('/reportes-mensuales', listarReportes);
router.post('/reportes-mensuales', crearReporteMensual);

router.use('/admin', adminRoutes);

export default router;
