import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLogin } from '../components/AdminLogin';
import { ReporteFormulario } from '../../reporte-mensual/components/ReporteFormulario';
import {
  actualizarAdminReporte,
  fetchAdminReporte,
} from '../api/admin.api';
import { isAdminAuthenticated } from '../../../lib/adminAuth';
import {
  reporteToFormData,
  type ReporteMensualFormData,
} from '../../reporte-mensual/types/reporteMensual.types';

export function AdminReporteEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [autenticado, setAutenticado] = useState(isAdminAuthenticated());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const { data: reporte, isLoading, error: errorCarga } = useQuery({
    queryKey: ['admin-reporte', id],
    queryFn: () => fetchAdminReporte(id!),
    enabled: autenticado && !!id,
  });

  if (!autenticado) {
    return <AdminLogin onLogin={() => setAutenticado(true)} />;
  }

  if (isLoading) return <p>Cargando reporte...</p>;

  if (errorCarga || !reporte) {
    return (
      <div className="admin-dashboard">
        <div className="alert-error">
          {errorCarga instanceof Error ? errorCarga.message : 'Reporte no encontrado'}
        </div>
        <Link to="/admin" className="btn btn-secondary">Volver al panel</Link>
      </div>
    );
  }

  const valoresIniciales = reporteToFormData(reporte);

  const onSubmit = async (formData: ReporteMensualFormData) => {
    setGuardando(true);
    setError(null);
    setExito(null);

    try {
      const res = await actualizarAdminReporte(reporte.id, formData);
      setExito(`Reporte actualizado. Matrícula total: ${res.matriculaGuardada.totalActivos}`);
      queryClient.invalidateQueries({ queryKey: ['admin-reportes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reporte', id] });
      queryClient.invalidateQueries({ queryKey: ['reportes-mensuales'] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al guardar'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-edit-header">
        <div>
          <Link to="/admin" className="admin-back-link">← Volver al panel</Link>
          <h2>Editar reporte — {reporte.agrupacion.nombre}</h2>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/admin')}
        >
          Cancelar
        </button>
      </div>

      <ReporteFormulario
        titulo="Editar indicador mensual"
        valoresIniciales={valoresIniciales}
        textoBoton="Guardar cambios"
        isSubmitting={guardando}
        error={error}
        mensajeExito={exito}
        onExitoDismiss={() => setExito(null)}
        onSubmit={onSubmit}
        resetearAlCambiarPeriodo={false}
      />
    </div>
  );
}
