import { useState } from 'react';
import { diaCorto } from '../../constancias/lib/textoConstancia';
import type { ArchivoDescargado } from '../api/psb.api';
import { textoSemana } from '../lib/fechas';
import { descargarBase64, wordDesactualizado } from '../lib/enviar';
import type { InformePSB } from '../tipos';

interface Props {
  informes: InformePSB[];
  cargando?: boolean;
  error?: unknown;
  /** Trae el Word desde el servicio (Drive es privado). */
  descargarWord: (id: string) => Promise<ArchivoDescargado>;
  /** Coordinación: enlace directo a la carpeta en Drive. */
  conEnlacesDrive?: boolean;
}

function estadoWord(inf: InformePSB): { texto: string; clase: string } {
  if (!inf.archivo) return { texto: 'Word pendiente', clase: 'estado-pendiente' };
  if (wordDesactualizado(inf)) return { texto: 'Word sin las últimas clases', clase: 'estado-pendiente' };
  return { texto: 'Word listo', clase: 'estado-listo' };
}

/** Semanas con clases del Programa Simón Bolívar, de la más reciente a la más antigua. */
export function ListaInformesPSB({ informes, cargando, error, descargarWord, conEnlacesDrive }: Props) {
  const [bajando, setBajando] = useState<string | null>(null);
  const ordenados = [...informes]
    .filter((i) => i.dias.length > 0)
    .sort((a, b) => b.semana.localeCompare(a.semana) || a.escuela.localeCompare(b.escuela));

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
  if (ordenados.length === 0) return <p className="fechas-ayuda">Todavía no hay clases reportadas.</p>;

  return (
    <ul className="profesores-lista informes-psb">
      {ordenados.map((inf) => {
        const fotos = inf.dias.reduce((n, d) => n + d.fotos.length, 0);
        const word = estadoWord(inf);
        return (
          <li key={inf.id}>
            <div>
              <strong>{inf.escuela}</strong>
              <span>{textoSemana(inf.semana)}</span>
              <span className="fechas-ayuda">
                Clases: {inf.dias.map((d) => diaCorto(d.fecha)).join(', ')} · {fotos} {fotos === 1 ? 'foto' : 'fotos'}
                {inf.profesor ? ` · ${inf.profesor}` : ''}
              </span>
              <span className={`estado-word ${word.clase}`}>{word.texto}</span>
            </div>
            <div className="admin-acciones">
              {inf.archivo && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => bajar(inf)} disabled={bajando === inf.id}>
                  {bajando === inf.id ? 'Descargando…' : 'Descargar Word'}
                </button>
              )}
              {conEnlacesDrive && inf.carpeta?.url && (
                <a className="btn btn-secondary btn-sm" href={inf.carpeta.url} target="_blank" rel="noreferrer">
                  Abrir carpeta en Drive
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
