import {
  CATEGORIAS_DEMOGRAFICAS,
  MESES,
  formatFechaIso,
  parseTemasRepertorio,
  totalDesdeReporte,
  type ReporteMensualGuardado,
} from '../types/reporteMensual.types';

interface Props {
  reporte: ReporteMensualGuardado;
  onCerrar: () => void;
}

export function ReporteDetalle({ reporte, onCerrar }: Props) {
  const temas = parseTemasRepertorio(reporte.repertorioTexto);
  const fechasEnsayo = [...reporte.ensayos]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((e) => formatFechaIso(e.fecha));

  return (
    <div className="reporte-detalle-overlay" onClick={onCerrar}>
      <div
        className="reporte-detalle"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-titulo"
      >
        <div className="reporte-detalle-header">
          <div>
            <h3 id="detalle-titulo">{reporte.agrupacion.nombre}</h3>
            <p className="reporte-detalle-periodo">
              {MESES[reporte.mes - 1]} {reporte.anio}
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onCerrar}>
            Cerrar
          </button>
        </div>

        <div className="reporte-detalle-grid">
          <section>
            <h4>Fechas de ensayo ({fechasEnsayo.length})</h4>
            {fechasEnsayo.length > 0 ? (
              <div className="fechas-lista">
                {fechasEnsayo.map((f) => (
                  <span key={f} className="fecha-chip">{f}</span>
                ))}
              </div>
            ) : (
              <p className="detalle-vacio">Sin fechas registradas</p>
            )}
          </section>

          <section>
            <h4>Repertorio ({temas.length})</h4>
            {temas.length > 0 ? (
              <ul className="detalle-lista">
                {temas.map((tema) => (
                  <li key={tema}>{tema}</li>
                ))}
              </ul>
            ) : (
              <p className="detalle-vacio">Sin repertorio registrado</p>
            )}
          </section>

          <section>
            <h4>Matrícula — Total: {totalDesdeReporte(reporte)}</h4>
            <div className="demografia-grid">
              {CATEGORIAS_DEMOGRAFICAS.map(({ label, campo }) => (
                <div key={campo} className="demografia-item">
                  <label>{label}</label>
                  <output>{reporte[campo]}</output>
                </div>
              ))}
            </div>
          </section>

          {reporte.observaciones && (
            <section>
              <h4>Observaciones</h4>
              <p className="detalle-texto">{reporte.observaciones}</p>
            </section>
          )}

          <section className="detalle-meta">
            <span>Guardado: {formatFechaIso(reporte.createdAt)}</span>
            <span>{reporte.cerrado ? 'Cerrado' : 'Borrador'}</span>
          </section>
        </div>
      </div>
    </div>
  );
}
