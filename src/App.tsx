import { BrowserRouter, Navigate, Routes, Route, useParams } from 'react-router-dom';
import { InicioPage } from './pages/InicioPage';
import { ProfesoresPage } from './pages/ProfesoresPage';
import { ConstanciasPage } from './pages/ConstanciasPage';
import { AdminLayout } from './features/admin/components/AdminLayout';
import { AdminDashboard } from './features/admin/pages/AdminDashboard';
import { AdminReporteEditPage } from './features/admin/pages/AdminReporteEditPage';
import { AdminConstanciasPage } from './features/admin/pages/AdminConstanciasPage';
import { AdminConstanciaPage } from './features/admin/pages/AdminConstanciaPage';
import { AdminPlantillasPage } from './features/admin/pages/AdminPlantillasPage';
import { AdminPlantillaPage } from './features/admin/pages/AdminPlantillaPage';
import { AdminProfesoresPage } from './features/admin/pages/AdminProfesoresPage';
import { AdminPSBPage } from './features/admin/pages/AdminPSBPage';
import { AdminProfesorPage } from './features/admin/pages/AdminProfesorPage';
import { AdminAgrupacionesPage } from './features/admin/pages/AdminAgrupacionesPage';

/** Enlace corto del aviso por WhatsApp: /r/CT26-XXXXXX → revisión en el panel. */
function RevisarSolicitud() {
  const { codigo } = useParams<{ codigo: string }>();
  return <Navigate to={`/admin/constancias/${codigo}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<InicioPage />} />
        <Route path="/profesores" element={<ProfesoresPage />} />
        {/* Antes el formulario de reportes estaba en la raíz. */}
        <Route path="/reportes" element={<Navigate to="/profesores" replace />} />
        <Route path="/constancias" element={<ConstanciasPage />} />
        <Route path="/p/:codigo" element={<ConstanciasPage />} />
        <Route path="/r/:codigo" element={<RevisarSolicitud />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="reportes/:id" element={<AdminReporteEditPage />} />
          <Route path="profesores" element={<AdminProfesoresPage />} />
          <Route path="profesores/:cedula" element={<AdminProfesorPage />} />
          <Route path="agrupaciones" element={<AdminAgrupacionesPage />} />
          <Route path="psb" element={<AdminPSBPage />} />
          <Route path="constancias" element={<AdminConstanciasPage />} />
          <Route path="constancias/plantillas" element={<AdminPlantillasPage />} />
          <Route path="constancias/plantillas/nueva" element={<AdminPlantillaPage />} />
          <Route path="constancias/plantillas/:codigo" element={<AdminPlantillaPage />} />
          <Route path="constancias/nueva" element={<AdminConstanciaPage nueva />} />
          <Route path="constancias/:codigo" element={<AdminConstanciaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
