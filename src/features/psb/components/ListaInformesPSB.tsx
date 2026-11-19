import { useState } from 'react';
import { diaCorto } from '../../constancias/lib/textoConstancia';
import { textoSemana } from '../lib/fechas';
import { descargarBase64 } from '../lib/enviar';
import type { InformePSB } from '../tipos';

interface Props {
  informes: InformePSB[];
  cargando?: boolean;
  error?: unknown;
  /** Trae el Word desde el servicio (Drive es privado). */
  descargarWord: (id: string) => Promise<{ nombre: string; base64: string }>;
  /** Coordinación: enlaces directos a Drive. */
  conEnlacesDrive?: boolean;
}

/** Informes PSB, de la semana más reciente a la más antigua. */
export function ListaInformesPSB({ informes, cargando, error, descargarWord, conEnlacesDrive }: Props) {
  const [bajando, setBajando] = useState<string | null>(null);
  const ordenados = [...informes].sort((a, b) => b.semana.localeCompare(a.semana) || a.escuela.localeCompare(b.escuela));

  const bajar = async (inf: InformePSB) => {
    setBajando(inf.id);
    try {
      const { nombre, base64 } = await descargarWord(inf.id);
      descargarBase64(base64, nombre);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo descargar el informe.');
    } finally {
      setBajando(null);
    }
  };

  if (cargando) return <p>Cargando informes…</p>;
  if (error) {
    return <div className="alert-error">{error instanceof Error ? error.message : 'No se pudieron cargar los informes.'}</div>;
  }
  if (ordenados.length === 0) return <p className="fechas-ayuda">Todavía no hay informes enviados.</p>;

  return (
    <ul className="profesores-lista informes-psb">
      {ordenados.map((inf) => (
        <li key={inf.id}>
          <div>
            <strong>{inf.escuela}</strong>
            <span>{textoSemana(inf.semana)}</span>
            <span className="fechas-ayuda">
              Clases: {inf.dias.map((d) => diaCorto(d.fecha)).join(', ')} · {inf.alumnos} alumnos · {inf.fotos.length}{' '}
              {inf.fotos.length === 1 ? 'foto' : 'fotos'}
              {inf.profesor ? ` · Enviado por ${inf.profesor}` : ''}
            </span>
          </div>
          <div className="admin-acciones">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => bajar(inf)} disabled={bajando === inf.id}>
              {bajando === inf.id ? 'Descargando…' : 'Descargar Word'}
            </button>
            {conEnlacesDrive && inf.carpeta?.url && (
              <a className="btn btn-secondary btn-sm" href={inf.carpeta.url} target="_blank" rel="noreferrer">
                Abrir carpeta en Drive
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
