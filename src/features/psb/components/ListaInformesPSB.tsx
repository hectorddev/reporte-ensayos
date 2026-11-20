import type { ReactNode } from 'react';
import { diaCorto } from '../../constancias/lib/textoConstancia';
import { textoSemana } from '../lib/fechas';
import type { InformePSB } from '../tipos';

interface Props {
  informes: InformePSB[];
  cargando?: boolean;
  error?: unknown;
  /** Botones de cada semana (coordinación: armar el Word, abrir la carpeta). */
  acciones?: (inf: InformePSB) => ReactNode;
  /** Contenido debajo de una semana (coordinación: el formulario del Word). */
  detalle?: (inf: InformePSB) => ReactNode;
}

/** Semanas con clases del Programa Simón Bolívar, de la más reciente a la más antigua. */
export function ListaInformesPSB({ informes, cargando, error, acciones, detalle }: Props) {
  const ordenados = [...informes]
    .filter((i) => i.dias.length > 0)
    .sort((a, b) => b.semana.localeCompare(a.semana) || a.escuela.localeCompare(b.escuela));

  if (cargando) return <p>Cargando clases…</p>;
  if (error) {
    return <div className="alert-error">{error instanceof Error ? error.message : 'No se pudieron cargar las clases.'}</div>;
  }
  if (ordenados.length === 0) return <p className="fechas-ayuda">Todavía no hay clases reportadas.</p>;

  return (
    <ul className="profesores-lista informes-psb">
      {ordenados.map((inf) => {
        const fotos = inf.dias.reduce((n, d) => n + d.fotos.length, 0);
        const formadores = [...new Set(inf.dias.map((d) => d.formador || inf.profesor).filter(Boolean))].join(', ');
        return (
          <li key={inf.id} data-semana={inf.semana} data-modulo={inf.modulo}>
            <div>
              <strong>{inf.escuela}</strong>
              <span>{textoSemana(inf.semana)}</span>
              <span className="fechas-ayuda">
                {inf.dias.length} {inf.dias.length === 1 ? 'clase' : 'clases'}: {inf.dias.map((d) => diaCorto(d.fecha)).join(', ')} ·{' '}
                {fotos} {fotos === 1 ? 'foto' : 'fotos'}
                {formadores ? ` · ${formadores}` : ''}
              </span>
            </div>
            {acciones && <div className="admin-acciones">{acciones(inf)}</div>}
            {detalle?.(inf)}
          </li>
        );
      })}
    </ul>
  );
}
