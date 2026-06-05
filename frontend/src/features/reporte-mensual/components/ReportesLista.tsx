import { useState } from 'react';
import { useReportesMensuales } from '../hooks/useReportesMensuales';
import { useAgrupaciones } from '../hooks/useAgrupaciones';
import { ReporteDetalle } from './ReporteDetalle';
import {
  MESES,
  totalDesdeReporte,
  type ReporteMensualGuardado,
} from '../types/reporteMensual.types';

export function ReportesLista() {
  const [filtroAgrupacion, setFiltroAgrupacion] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteMensualGuardado | null>(null);

  const { data: agrupaciones = [] } = useAgrupaciones();
  const { data: reportes = [], isLoading, error, refetch } = useReportesMensuales({
    agrupacionId: filtroAgrupacion || undefined,
    anio: filtroAnio ? Number(filtroAnio) : undefined,
  });

  const anios = [...new Set(reportes.map((r) => r.anio))].sort((a, b) => b - a);

  return (
    <div className="reportes-lista">
      <div className="reportes-lista-header">
        <h2>Reportes guardados</h2>
        <button type="button" className="btn btn-secondary" onClick={() => refetch()}>
          Actualizar
        </button>
      </div>

      <div className="reportes-filtros">
        <select
          value={filtroAgrupacion}
          onChange={(e) => setFiltroAgrupacion(e.target.value)}
          aria-label="Filtrar por agrupación"
        >
          <option value="">Todas las agrupaciones</option>
          {agrupaciones.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>

        <select
          value={filtroAnio}
          onChange={(e) => setFiltroAnio(e.target.value)}
          aria-label="Filtrar por año"
        >
          <option value="">Todos los años</option>
          {anios.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {isLoading && <p>Cargando reportes...</p>}

      {error && (
        <div className="alert-error">
          {error instanceof Error ? error.message : 'Error al cargar reportes'}
        </div>
      )}

      {!isLoading && !error && reportes.length === 0 && (
        <div className="reportes-vacio">
          <p>No hay reportes guardados todavía.</p>
          <p className="fechas-ayuda">
            Ve a &quot;Nuevo reporte&quot;, completa el formulario y pulsa &quot;Cerrar reporte mensual&quot;.
          </p>
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
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reportes.map((reporte) => (
                <tr key={reporte.id}>
                  <td>{MESES[reporte.mes - 1]} {reporte.anio}</td>
                  <td>{reporte.agrupacion.nombre}</td>
                  <td>{reporte.ensayos.length}</td>
                  <td>{totalDesdeReporte(reporte)}</td>
                  <td>
                    <span className={`estado-badge ${reporte.cerrado ? 'cerrado' : 'borrador'}`}>
                      {reporte.cerrado ? 'Cerrado' : 'Borrador'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setReporteSeleccionado(reporte)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reporteSeleccionado && (
        <ReporteDetalle
          reporte={reporteSeleccionado}
          onCerrar={() => setReporteSeleccionado(null)}
        />
      )}
    </div>
  );
}
