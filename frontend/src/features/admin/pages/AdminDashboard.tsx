import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLogin } from '../components/AdminLogin';
import { fetchAdminReportes, eliminarAdminReporte } from '../api/admin.api';
import { isAdminAuthenticated } from '../../../lib/adminAuth';
import {
  MESES,
  totalDesdeReporte,
  type ReporteMensualGuardado,
} from '../../reporte-mensual/types/reporteMensual.types';

export function AdminDashboard() {
  const [autenticado, setAutenticado] = useState(isAdminAuthenticated());
  const queryClient = useQueryClient();

  const { data: reportes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-reportes'],
    queryFn: fetchAdminReportes,
    enabled: autenticado,
  });

  const eliminar = async (reporte: ReporteMensualGuardado) => {
    const confirmar = window.confirm(
      `¿Eliminar el reporte de ${reporte.agrupacion.nombre} — ${MESES[reporte.mes - 1]} ${reporte.anio}?`
    );
    if (!confirmar) return;

    try {
      await eliminarAdminReporte(reporte.id);
      queryClient.invalidateQueries({ queryKey: ['admin-reportes'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  if (!autenticado) {
    return <AdminLogin onLogin={() => setAutenticado(true)} />;
  }

  return (
    <div className="admin-dashboard">
      <div className="reportes-lista-header">
        <h2>Todos los reportes ({reportes.length})</h2>
        <button type="button" className="btn btn-secondary" onClick={() => refetch()}>
          Actualizar
        </button>
      </div>

      {isLoading && <p>Cargando reportes...</p>}

      {error && (
        <div className="alert-error">
          {error instanceof Error ? error.message : 'Error al cargar'}
        </div>
      )}

      {!isLoading && !error && reportes.length === 0 && (
        <div className="reportes-vacio">
          <p>No hay reportes registrados en el sistema.</p>
        </div>
      )}

      {reportes.length > 0 && (
        <div className="reportes-tabla-wrap">
          <table className="reportes-tabla">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Agrupación</th>
                <th>Ensayos</th>
                <th>Matrícula</th>
                <th>Repertorio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reportes.map((reporte) => (
                <tr key={reporte.id}>
                  <td>{MESES[reporte.mes - 1]} {reporte.anio}</td>
                  <td>{reporte.agrupacion.nombre}</td>
                  <td>{reporte.ensayos.length}</td>
                  <td>{totalDesdeReporte(reporte)}</td>
                  <td>{reporte.repertorioTexto?.split('\n').length ?? 0} temas</td>
                  <td className="admin-acciones">
                    <Link
                      to={`/admin/reportes/${reporte.id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => eliminar(reporte)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
