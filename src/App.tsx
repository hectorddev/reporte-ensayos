import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ConstanciasPage } from './pages/ConstanciasPage';
import { AdminLayout } from './features/admin/components/AdminLayout';
import { AdminDashboard } from './features/admin/pages/AdminDashboard';
import { AdminReporteEditPage } from './features/admin/pages/AdminReporteEditPage';
import { AdminConstanciasPage } from './features/admin/pages/AdminConstanciasPage';
import { AdminConstanciaPage } from './features/admin/pages/AdminConstanciaPage';
import { AdminPlantillasPage } from './features/admin/pages/AdminPlantillasPage';
import { AdminPlantillaPage } from './features/admin/pages/AdminPlantillaPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/constancias" element={<ConstanciasPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="reportes/:id" element={<AdminReporteEditPage />} />
          <Route path="constancias" element={<AdminConstanciasPage />} />
          <Route path="constancias/plantillas" element={<AdminPlantillasPage />} />
          <Route path="constancias/plantillas/nueva" element={<AdminPlantillaPage />} />
          <Route path="constancias/plantillas/:codigo" element={<AdminPlantillaPage />} />
          <Route path="constancias/revisar" element={<AdminConstanciaPage origen="enlace" />} />
          <Route path="constancias/nueva" element={<AdminConstanciaPage origen="nueva" />} />
          <Route path="constancias/:codigo" element={<AdminConstanciaPage origen="historial" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
