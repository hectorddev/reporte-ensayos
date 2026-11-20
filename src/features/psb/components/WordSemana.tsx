import { useState } from 'react';
import type { SesionProfesor } from '../../../lib/profesorAuth';
import { INFORME_PSB } from '../config';
import { descargarInformePSB } from '../api/psb.api';
import { armarWordSemana, descargar, descargarBase64, wordDesactualizado, type DocumentoListo } from '../lib/enviar';
import type { InformePSB } from '../tipos';

interface Props {
  sesion: SesionProfesor;
  informe: InformePSB;
  /** Agrupaciones del último Word de esa escuela, para proponerlas. */
  agrupacionesAnteriores?: string;
  onActualizado: (semana: InformePSB) => void;
}

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: 'numeric', minute: '2-digit' });

/** Word de la semana: se arma con las clases ya guardadas, sin volver a escribirlas. */
export function WordSemana({ sesion, informe, agrupacionesAnteriores, onActualizado }: Props) {
  const formadores = [...new Set(informe.dias.map((d) => d.formador).filter(Boolean))].join(', ');
  const [evento, setEvento] = useState(informe.evento || INFORME_PSB.eventoPorDefecto);
  const [agrupaciones, setAgrupaciones] = useState(informe.agrupaciones || agrupacionesAnteriores || '');
  const [alumnos, setAlumnos] = useState(informe.alumnos ? String(informe.alumnos) : '');
  const [instructores, setInstructores] = useState(informe.instructores || formadores || sesion.nombre);
  const [avance, setAvance] = useState('');
  const [error, setError] = useState('');
  const [documento, setDocumento] = useState<DocumentoListo | null>(null);
  const [bajando, setBajando] = useState(false);

  const generar = async () => {
    if (!evento.trim() || !agrupaciones.trim() || !(Number(alumnos) > 0) || !instructores.trim()) {
      setError('Completa el nombre del evento, las agrupaciones, la cantidad de alumnos y los instructores.');
      return;
    }
    setError('');
    setDocumento(null);
    try {
      const { informe: guardado, documento: doc } = await armarWordSemana(
        informe,
        { evento: evento.trim(), agrupaciones: agrupaciones.trim(), instructores: instructores.trim(), alumnos: Number(alumnos) },
        { responsable: sesion.nombre, telefonos: sesion.telefonosNucleo || INFORME_PSB.telefonosPorDefecto },
        setAvance
      );
      setDocumento(doc);
      onActualizado(guardado);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'No hay conexión con el servicio. Inténtalo de nuevo cuando tengas internet.'
          : err instanceof Error
            ? err.message
            : 'No se pudo armar el Word.'
      );
    } finally {
      setAvance('');
    }
  };

  const bajarGuardado = async () => {
    setBajando(true);
    try {
      const { nombre, base64 } = await descargarInformePSB(informe.id);
      descargarBase64(base64, nombre);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo descargar el Word.');
    } finally {
      setBajando(false);
    }
  };

  return (
    <section className="word-semana">
      <h3>Word de la semana</h3>
      <p className="fechas-ayuda">
        Se arma con las {informe.dias.length} {informe.dias.length === 1 ? 'clase guardada' : 'clases guardadas'} y sus
        fotos, con el formato del núcleo, y queda en el Drive de la coordinación.
      </p>

      {informe.archivo && informe.wordEn && (
        <p className={wordDesactualizado(informe) ? 'aviso-info aviso-alerta' : 'aviso-info'}>
          Word generado el {fechaHora(informe.wordEn)}
          {informe.wordPor ? ` por ${informe.wordPor}` : ''}.
          {wordDesactualizado(informe) && ' Después cambiaron las clases: vuelve a generarlo para que salgan.'}
        </p>
      )}

      <div className="campos-grid">
        <div>
          <label htmlFor="word-evento">Nombre del evento</label>
          <input id="word-evento" type="text" value={evento} onChange={(e) => setEvento(e.target.value)} />
        </div>
        <div>
          <label htmlFor="word-agrupaciones">Agrupaciones participantes</label>
          <input
            id="word-agrupaciones"
            type="text"
            placeholder="Ej: Básica"
            value={agrupaciones}
            onChange={(e) => setAgrupaciones(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="word-alumnos">Cantidad de alumnos de la semana</label>
          <input
            id="word-alumnos"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="Ej: 155"
            value={alumnos}
            onChange={(e) => setAlumnos(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="word-instructores">Instructor(es)</label>
          <input id="word-instructores" type="text" value={instructores} onChange={(e) => setInstructores(e.target.value)} />
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="admin-acciones">
        <button type="button" className="btn btn-primary" onClick={generar} disabled={!!avance}>
          {avance || (informe.archivo ? 'Volver a generar el Word' : 'Generar el Word de la semana')}
        </button>
        {documento ? (
          <button type="button" className="btn btn-secondary" onClick={() => descargar(documento.blob, documento.nombre)}>
            Descargar el Word
          </button>
        ) : (
          informe.archivo && (
            <button type="button" className="btn btn-secondary" onClick={bajarGuardado} disabled={bajando}>
              {bajando ? 'Descargando…' : 'Descargar el Word'}
            </button>
          )
        )}
      </div>
      {documento && <p className="aviso-info">Listo: el Word quedó guardado en el Drive de la coordinación.</p>}
    </section>
  );
}
