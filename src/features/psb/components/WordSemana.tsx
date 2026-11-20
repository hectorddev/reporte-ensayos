import { useState } from 'react';
import { INFORME_PSB } from '../config';
import { descargarArchivoPSBCoordinacion } from '../api/psb.api';
import { armarWordSemana, descargar, type DatosWord, type DocumentoListo } from '../lib/enviar';
import type { InformePSB } from '../tipos';

interface Props {
  clave: string;
  informe: InformePSB;
  /** Agrupaciones de otra semana de esa escuela, para proponerlas. */
  agrupacionesAnteriores?: string;
  onCerrar: () => void;
}

/** Lo último que escribió la coordinación (por escuela), para no repetirlo cada semana. */
interface Recordado {
  telefonos?: string;
  escuelas?: Record<string, { evento?: string; agrupaciones?: string }>;
}
const LLAVE = 'psb_word';

function leerRecordado(): Recordado {
  try {
    return JSON.parse(localStorage.getItem(LLAVE) ?? '{}') as Recordado;
  } catch {
    return {};
  }
}

function recordar(modulo: string, d: DatosWord) {
  try {
    const r = leerRecordado();
    r.telefonos = d.telefonos;
    r.escuelas = { ...r.escuelas, [modulo]: { evento: d.evento, agrupaciones: d.agrupaciones } };
    localStorage.setItem(LLAVE, JSON.stringify(r));
  } catch {
    // Sin almacenamiento: la próxima vez se vuelve a escribir.
  }
}

/** «14 niños y 3 niñas» → 17 */
const contar = (texto: string) => (texto.match(/\d+/g) ?? []).reduce((n, x) => n + Number(x), 0);

/**
 * Word de la semana (coordinación): se arma con las clases que guardaron los
 * formadores y sus fotos, con el formato del núcleo, y se descarga.
 */
export function WordSemana({ clave, informe, agrupacionesAnteriores, onCerrar }: Props) {
  const recordado = leerRecordado();
  const deEscuela = recordado.escuelas?.[informe.modulo];
  const formadores = [...new Set(informe.dias.map((d) => d.formador || informe.profesor).filter(Boolean))].join(', ');
  const atendidos = informe.dias.reduce((n, d) => n + contar(d.atendidos ?? ''), 0);

  const [evento, setEvento] = useState(informe.evento || deEscuela?.evento || INFORME_PSB.eventoPorDefecto);
  const [agrupaciones, setAgrupaciones] = useState(
    informe.agrupaciones || deEscuela?.agrupaciones || agrupacionesAnteriores || ''
  );
  const [alumnos, setAlumnos] = useState(informe.alumnos ? String(informe.alumnos) : atendidos ? String(atendidos) : '');
  const [instructores, setInstructores] = useState(informe.instructores || formadores);
  const [responsable, setResponsable] = useState(formadores);
  const [telefonos, setTelefonos] = useState(recordado.telefonos || INFORME_PSB.telefonosPorDefecto);
  const [avance, setAvance] = useState('');
  const [error, setError] = useState('');
  const [documento, setDocumento] = useState<DocumentoListo | null>(null);

  const generar = async () => {
    const datos: DatosWord = {
      evento: evento.trim(),
      agrupaciones: agrupaciones.trim(),
      alumnos: Number(alumnos),
      instructores: instructores.trim(),
      responsable: responsable.trim(),
      telefonos: telefonos.trim(),
    };
    if (!datos.evento || !datos.agrupaciones || !(datos.alumnos > 0) || !datos.instructores || !datos.responsable || !datos.telefonos) {
      setError('Completa todos los datos del Word.');
      return;
    }
    setError('');
    setDocumento(null);
    try {
      const doc = await armarWordSemana(informe, datos, (id) => descargarArchivoPSBCoordinacion(clave, id), setAvance);
      recordar(informe.modulo, datos);
      setDocumento(doc);
      descargar(doc.blob, doc.nombre);
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

  const campo = (id: string, etiqueta: string, valor: string, cambiar: (v: string) => void, extra?: object) => (
    <div>
      <label htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        type="text"
        value={valor}
        onChange={(e) => {
          cambiar(e.target.value);
          setError('');
        }}
        {...extra}
      />
    </div>
  );

  return (
    <section className="word-semana informe-word">
      <h3>Word de la semana</h3>
      <p className="fechas-ayuda">
        Se arma con {informe.dias.length === 1 ? 'la clase guardada' : `las ${informe.dias.length} clases guardadas`} y sus
        fotos, con el formato del núcleo. Revisa los datos y descárgalo.
      </p>

      <div className="campos-grid">
        {campo('word-evento', 'Nombre del evento', evento, setEvento)}
        {campo('word-agrupaciones', 'Agrupaciones participantes', agrupaciones, setAgrupaciones, { placeholder: 'Ej: Básica' })}
        <div>
          <label htmlFor="word-alumnos">Alumnos de la semana</label>
          <input
            id="word-alumnos"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="Ej: 155"
            value={alumnos}
            onChange={(e) => {
              setAlumnos(e.target.value);
              setError('');
            }}
          />
          {atendidos > 0 && (
            <p className="fechas-ayuda">Suma de los atendidos de cada clase ({atendidos}); corrígelo si hace falta.</p>
          )}
        </div>
        {campo('word-instructores', 'Instructor(es)', instructores, setInstructores)}
        {campo('word-responsable', 'Responsable del evento', responsable, setResponsable)}
        {campo('word-telefonos', 'Teléfonos del núcleo', telefonos, setTelefonos)}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="admin-acciones">
        <button type="button" className="btn btn-primary" onClick={generar} disabled={!!avance}>
          {avance || 'Armar y descargar el Word'}
        </button>
        {documento && (
          <button type="button" className="btn btn-secondary" onClick={() => descargar(documento.blob, documento.nombre)}>
            Descargar de nuevo
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onCerrar} disabled={!!avance}>
          Cerrar
        </button>
      </div>
      {documento && <p className="aviso-info">Listo: se descargó «{documento.nombre}».</p>}
    </section>
  );
}
