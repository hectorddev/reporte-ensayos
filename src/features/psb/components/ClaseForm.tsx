import { useState } from 'react';
import { CampoHora } from '../../constancias/components/CampoHora';
import { diaCorto } from '../../constancias/lib/textoConstancia';
import type { SesionProfesor } from '../../../lib/profesorAuth';
import { INFORME_PSB } from '../config';
import { semanaArchivo, textoSemana } from '../lib/fechas';
import { prepararFoto, textoPeso } from '../lib/fotos';
import { compartirClase } from '../lib/enviar';
import { ClaseRechazada, claveDeClase, enviarPendiente, guardarPendiente, quitarPendiente, type ClasePendiente } from '../lib/cola';
import { EVENTO_PENDIENTES, pedirEnvioEnSegundoPlano } from '../lib/envioAutomatico';
import { mensajeTelegram } from '../lib/mensaje';
import type { ArchivoDrive, DatosDelDia, DiaPSB, FotoLocal, InformePSB } from '../tipos';

const CLAVE_LIDER = 'psb_lider';

function liderGuardado(): string {
  try {
    return localStorage.getItem(CLAVE_LIDER) ?? '';
  } catch {
    return '';
  }
}

interface Props {
  sesion: SesionProfesor;
  modulo: string;
  escuela: string;
  semana: string;
  fecha: string;
  /** La clase ya enviada de ese día (para corregirla). */
  guardada?: DiaPSB;
  /** La clase de ese día que todavía está en el teléfono. */
  pendiente?: ClasePendiente;
  /** La última clase de esa escuela: sus datos se proponen para no escribirlos otra vez. */
  anterior?: DiaPSB;
  onGuardada: (semana: InformePSB) => void;
  onVolver: () => void;
}

type Estado =
  | { tipo: 'editando' }
  | { tipo: 'guardando' }
  | { tipo: 'listo'; mensaje: string; foto: FotoLocal | null; enTelefono: boolean }
  | { tipo: 'error'; mensaje: string };

/** Reporte de la clase de un día: datos, una foto y el mensaje para Telegram. */
export function ClaseForm({ sesion, modulo, escuela, semana, fecha, guardada, pendiente, anterior, onGuardada, onVolver }: Props) {
  const base: Partial<DatosDelDia> | undefined = pendiente?.dia ?? guardada ?? anterior;
  const [horaInicio, setHoraInicio] = useState(base?.horaInicio ?? '');
  const [horaFin, setHoraFin] = useState(base?.horaFin ?? '');
  const [tipoActividad, setTipoActividad] = useState(base?.tipoActividad ?? '');
  const [atendidos, setAtendidos] = useState(base?.atendidos ?? '');
  const [niveles, setNiveles] = useState(base?.niveles ?? '');
  const [adultos, setAdultos] = useState(base?.adultos ?? '');
  const [descripcion, setDescripcion] = useState(pendiente?.dia.descripcion ?? guardada?.descripcion ?? '');
  // Una sola foto: la ya enviada (si se conserva) o una nueva tomada en el teléfono.
  const [fotoGuardada, setFotoGuardada] = useState<ArchivoDrive | null>(
    (pendiente ? pendiente.fotosGuardadas[0] : guardada?.fotos[0]) ?? null
  );
  const [fotoNueva, setFotoNueva] = useState<FotoLocal | null>(pendiente?.fotoNueva ?? null);
  const [lider, setLider] = useState(sesion.liderPSB || liderGuardado());
  const [preparando, setPreparando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [estado, setEstado] = useState<Estado>({ tipo: 'editando' });
  const [aviso, setAviso] = useState('');

  const titulo = diaCorto(fecha);
  const corrigiendo = !!(guardada || pendiente);

  const elegirFoto = async (archivos: FileList | null) => {
    const archivo = archivos?.[0];
    if (!archivo) return;
    setPreparando(true);
    try {
      setFotoNueva(await prepararFoto(archivo));
      setFotoGuardada(null); // la nueva reemplaza a la enviada
    } catch {
      window.alert('No se pudo abrir la foto. Prueba con otra.');
    } finally {
      setPreparando(false);
    }
  };

  const datosDelDia = (): DatosDelDia => ({
    fecha,
    horaInicio,
    horaFin,
    descripcion: descripcion.trim(),
    tipoActividad: tipoActividad.trim(),
    atendidos: atendidos.trim(),
    niveles: niveles.trim(),
    adultos: adultos.trim(),
  });

  const validar = (): string[] => {
    const lista: string[] = [];
    if (!horaInicio || !horaFin) lista.push('Indica la hora de inicio y de fin.');
    else if (horaFin <= horaInicio) lista.push('La hora de fin debe ser después de la de inicio. Revisa am / pm.');
    if (!tipoActividad.trim()) lista.push('Escribe el tipo de actividad.');
    if (!atendidos.trim()) lista.push('Escribe cuántos estudiantes atendiste.');
    if (!niveles.trim()) lista.push('Escribe los niveles.');
    if (!descripcion.trim()) lista.push('Escribe el repertorio y lo que se trabajó.');
    if (!sesion.liderPSB && !lider.trim()) lista.push('Escribe el nombre del líder del PSB.');
    return lista;
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const lista = validar();
    setErrores(lista);
    if (lista.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!fotoGuardada && !fotoNueva && !window.confirm('Esta clase no tiene foto. ¿Guardarla así?')) return;
    if (!sesion.liderPSB) {
      try {
        localStorage.setItem(CLAVE_LIDER, lider.trim());
      } catch {
        // Habrá que escribirlo otra vez.
      }
    }

    const dia = datosDelDia();
    const mensaje = mensajeTelegram(dia, { escuela, formador: sesion.nombre, lider: lider.trim() });
    const clase: ClasePendiente = {
      clave: claveDeClase(sesion.cedula, modulo, semana, fecha),
      cedula: sesion.cedula,
      modulo,
      escuela,
      semana,
      semanaTexto: semanaArchivo(semana),
      carpetaSemana: textoSemana(semana).replace(/\//g, '-'),
      dia,
      fotosGuardadas: fotoGuardada ? [fotoGuardada] : [],
      fotoNueva,
      creadaEn: new Date().toISOString(),
    };

    setEstado({ tipo: 'guardando' });
    // Primero queda en el teléfono: si no hay internet, no se pierde.
    try {
      await guardarPendiente(clase);
    } catch {
      setEstado({ tipo: 'error', mensaje: 'Este navegador no deja guardar la clase en el teléfono. Prueba con Chrome.' });
      return;
    }
    window.dispatchEvent(new Event(EVENTO_PENDIENTES));

    try {
      const semanaGuardada = await enviarPendiente(clase.clave);
      if (semanaGuardada) onGuardada(semanaGuardada);
      setEstado({ tipo: 'listo', mensaje, foto: fotoNueva, enTelefono: !semanaGuardada });
    } catch (err) {
      if (err instanceof ClaseRechazada) {
        await quitarPendiente(clase.clave).catch(() => undefined);
        setEstado({ tipo: 'error', mensaje: err.message });
        return;
      }
      // Sin internet: se enviará sola cuando vuelva la conexión.
      void pedirEnvioEnSegundoPlano();
      setEstado({ tipo: 'listo', mensaje, foto: fotoNueva, enTelefono: true });
    } finally {
      window.dispatchEvent(new Event(EVENTO_PENDIENTES));
    }
  };

  const compartir = async (texto: string, foto: FotoLocal | null) => {
    const resultado = await compartirClase(texto, foto ? [foto] : []);
    setAviso(
      resultado === 'copiado'
        ? 'Mensaje copiado. Ábrelo en Telegram, pégalo y adjunta la foto.'
        : 'Si Telegram no puso el texto, pégalo: ya quedó copiado.'
    );
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso('Mensaje copiado.');
    } catch {
      window.prompt('Copia el mensaje:', texto);
    }
  };

  if (estado.tipo === 'listo') {
    return (
      <div className="constancia-enviada clase-lista">
        {estado.enTelefono ? (
          <>
            <h2>Clase del {titulo} guardada en el teléfono</h2>
            <p className="aviso-info aviso-alerta">
              No hay conexión con el servicio. La clase quedó guardada en este teléfono y se enviará sola apenas haya
              internet. No borres los datos del navegador mientras tanto.
            </p>
          </>
        ) : (
          <h2>Clase del {titulo} guardada ✓</h2>
        )}
        <p>Comparte el mensaje en Telegram{estado.foto ? ' con la foto' : ''}:</p>
        <pre className="mensaje-telegram">{estado.mensaje}</pre>
        <div className="admin-acciones">
          <button type="button" className="btn btn-primary" onClick={() => compartir(estado.mensaje, estado.foto)}>
            Compartir en Telegram
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => copiar(estado.mensaje)}>
            Copiar mensaje
          </button>
          <button type="button" className="btn btn-secondary" onClick={onVolver}>
            Volver a la semana
          </button>
        </div>
        {aviso && <p className="aviso-info">{aviso}</p>}
      </div>
    );
  }

  const guardando = estado.tipo === 'guardando';

  return (
    <form className="constancia-form clase-psb" onSubmit={guardar} noValidate>
      <button type="button" className="btn btn-secondary volver-plantillas" onClick={onVolver}>
        ← Volver a la semana
      </button>
      <h2>Clase del {titulo}</h2>
      <p className="fechas-ayuda">{escuela}</p>

      {errores.length > 0 && (
        <div className="alert-error" role="alert">
          <strong>Falta completar:</strong>
          <ul>
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <h3>Horario</h3>
        <div className="horario-fila">
          <div className="horario-celda">
            <span>Desde</span>
            <CampoHora id="clase-inicio" value={horaInicio} onChange={setHoraInicio} etiqueta="Hora de inicio" />
          </div>
          <div className="horario-celda">
            <span>Hasta</span>
            <CampoHora id="clase-fin" value={horaFin} onChange={setHoraFin} etiqueta="Hora de fin" />
          </div>
        </div>
      </section>

      <section>
        <h3>La clase</h3>
        {!corrigiendo && anterior && (
          <p className="aviso-info">Pusimos los datos de tu clase anterior en esta escuela. Cámbialos si hace falta.</p>
        )}
        <div className="campos-grid">
          <div>
            <label htmlFor="clase-tipo">Tipo de actividad</label>
            <input
              id="clase-tipo"
              type="text"
              list="tipos-actividad"
              placeholder="Ej: Iniciación musical"
              value={tipoActividad}
              onChange={(e) => setTipoActividad(e.target.value)}
            />
            <datalist id="tipos-actividad">
              {INFORME_PSB.tiposActividad.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="clase-atendidos">Estudiantes atendidos</label>
            <input
              id="clase-atendidos"
              type="text"
              placeholder="Ej: 14 niños"
              value={atendidos}
              onChange={(e) => setAtendidos(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="clase-niveles">Niveles</label>
            <input
              id="clase-niveles"
              type="text"
              placeholder="Ej: 2, 3 y 4 años Inicial"
              value={niveles}
              onChange={(e) => setNiveles(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="clase-adultos">Personal adulto asistente (opcional)</label>
            <input
              id="clase-adultos"
              type="text"
              placeholder="Ej: 2 profesoras"
              value={adultos}
              onChange={(e) => setAdultos(e.target.value)}
            />
          </div>
          {!sesion.liderPSB && (
            <div>
              <label htmlFor="clase-lider">Líder del PSB</label>
              <input
                id="clase-lider"
                type="text"
                placeholder="Ej: Lcdo. …"
                value={lider}
                onChange={(e) => setLider(e.target.value)}
              />
              <p className="fechas-ayuda">Queda guardado en este teléfono.</p>
            </div>
          )}
          <div className="campo-ancho">
            <label htmlFor="clase-repertorio">Repertorio y lo que se trabajó</label>
            <textarea
              id="clase-repertorio"
              placeholder="Ej: ejercicios de acondicionamiento aeromuscular, vocalización, respiración, canción Burrito sabanero…"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
            {!corrigiendo && anterior?.descripcion && !descripcion && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDescripcion(anterior.descripcion)}>
                Usar el de la clase anterior
              </button>
            )}
          </div>
        </div>
      </section>

      <section>
        <h3>Foto de la clase</h3>
        {fotoNueva && <img className="foto-clase" src={fotoNueva.dataUrl} alt={`Foto de la clase del ${titulo}`} />}
        {fotoNueva?.peso && fotoNueva.pesoOriginal && fotoNueva.pesoOriginal > fotoNueva.peso && (
          <p className="fechas-ayuda foto-peso">
            Foto optimizada para subir rápido: {textoPeso(fotoNueva.pesoOriginal)} → {textoPeso(fotoNueva.peso)}
          </p>
        )}
        {fotoGuardada && <p className="aviso-info">Esta clase ya tiene su foto guardada.</p>}
        <div className="admin-acciones">
          <label className="btn btn-secondary boton-fotos">
            {preparando ? 'Preparando la foto…' : fotoNueva || fotoGuardada ? 'Cambiar la foto' : '+ Agregar la foto'}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={preparando}
              onChange={(e) => {
                void elegirFoto(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {(fotoNueva || fotoGuardada) && (
            <button
              type="button"
              className="btn btn-peligro-suave"
              onClick={() => {
                setFotoNueva(null);
                setFotoGuardada(null);
              }}
            >
              Quitar la foto
            </button>
          )}
        </div>
        <p className="fechas-ayuda">Va en el mensaje de Telegram y en la memoria fotográfica del Word.</p>
      </section>

      {estado.tipo === 'error' && (
        <div className="alert-error" role="alert">
          {estado.mensaje}
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-bloque" disabled={guardando || preparando}>
        {guardando ? 'Guardando…' : corrigiendo ? 'Guardar cambios de la clase' : 'Guardar clase y preparar mensaje'}
      </button>
    </form>
  );
}
