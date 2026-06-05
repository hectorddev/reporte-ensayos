import { Router } from 'express';
import { loginAdmin, requireAdmin } from '../middleware/adminAuth';
import {
  listarReportes,
  obtenerReporte,
  actualizarReporte,
  eliminarReporte,
} from '../controllers/reporteMensual.controller';

const router = Router();

router.post('/login', loginAdmin);

router.use(requireAdmin);

router.get('/reportes-mensuales', listarReportes);
router.get('/reportes-mensuales/:id', obtenerReporte);
router.put('/reportes-mensuales/:id', actualizarReporte);
router.delete('/reportes-mensuales/:id', eliminarReporte);

export default router;
