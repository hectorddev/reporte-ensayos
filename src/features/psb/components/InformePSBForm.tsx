import { useState } from 'react';
import { CampoHora } from '../../constancias/components/CampoHora';
import { diaCorto } from '../../constancias/lib/textoConstancia';
import { MODULOS_PSB, nombreEnCatalogo } from '../../../lib/datosEstaticos';
import type { SesionProfesor } from '../../../lib/profesorAuth';
import { INFORME_PSB } from '../config';
import { diasHabiles, semanasRecientes, textoSemana } from '../lib/fechas';
import { prepararFoto } from '../lib/fotos';
import { armarDocumento, descargar, enviarInforme, type DocumentoListo } from '../lib/enviar';
import type { DatosInforme, DiaFormulario, FotoLocal, InformePSB } from '../tipos';

interface Props {
  sesion: SesionProfesor;
  /** Informes ya enviados (para avisar si la semana se reemplaza). */
  enviados?: InformePSB[];
  onEnviado: () => void;
}

type Estado =
  | { tipo: 'editando' }
  | { tipo: 'enviando'; avance: string }
  | { tipo: 'listo'; documento: DocumentoListo }
  | { tipo: 'error'; mensaje: string; documento: DocumentoListo | null };

const diaVacio = (fecha: string, anterior?: DiaFormulario): DiaFormulario => ({
  fecha,
  // El horario suele repetirse: se copia del día anterior.
  horaInicio: anterior?.horaInicio ?? '',
  horaFin: anterior?.horaFin ?? '',
  descripcion: '',
  fotos: [],
});

/** Informe semanal del Programa Simón Bolívar: datos, días de clase y fotos. */
export function InformePSBForm({ sesion, enviados = [], onEnviado }: Props) {
  const semanas = semanasRecientes();
  const [modulo, setModulo] = useState(sesion.modulos.length === 1 ? sesion.modulos[0] : '');
  const [semana, setSemana] = useState(semanas[0].lunes);
  const [evento, setEvento] = useState(INFORME_PSB.eventoPorDefecto);
  const [agrupaciones, setAgrupaciones] = useState('');
  const [alumnos, setAlumnos] = useState('');
  const [instructores, setInstructores] = useState(sesion.nombre);
  const [dias, setDias] = useState<DiaFormulario[]>([]);
  const [preparando, setPreparando] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [estado, setEstado] = useState<Estado>({ tipo: 'editando' });

  const escuela = nombreEnCatalogo(MODULOS_PSB, modulo);
  const yaEnviado = enviados.find((i) => i.modulo === modulo && i.semana === semana);

  const cambiarSemana = (lunes: string) => {
    setSemana(lunes);
    // Los días elegidos eran de la otra semana.
    setDias([]);
  };

  const alternarDia = (fecha: string) =>
    setDias((actuales) => {
      if (actuales.some((d) => d.fecha === fecha)) return actuales.filter((d) => d.fecha !== fecha);
      const anteriores = actuales.filter((d) => d.fecha < fecha).sort((a, b) => b.fecha.localeCompare(a.fecha));
      return [...actuales, diaVacio(fecha, anteriores[0] ?? actuales[0])].sort((a, b) => a.fecha.localeCompare(b.fecha));
    });

  const cambiarDia = (fecha: string, cambios: Partial<DiaFormulario>) =>
    setDias((actuales) => actuales.map((d) => (d.fecha === fecha ? { ...d, ...cambios } : d)));

  const agregarFotos = async (fecha: string, archivos: FileList | null) => {
    if (!archivos?.length) return;
    const dia = dias.find((d) => d.fecha === fecha);
    const espacio = INFORME_PSB.maxFotosPorDia - (dia?.fotos.length ?? 0);
    const elegidas = [...archivos].slice(0, Math.max(0, espacio));
    setPreparando(fecha);
    try {
      const nuevas: FotoLocal[] = [];
      for (const archivo of elegidas) nuevas.push(await prepararFoto(archivo));
      setDias((actuales) => actuales.map((d) => (d.fecha === fecha ? { ...d, fotos: [...d.fotos, ...nuevas] } : d)));
      if (archivos.length > elegidas.length) {
        window.alert(`Se agregaron ${elegidas.length}. Caben hasta ${INFORME_PSB.maxFotosPorDia} fotos por día.`);
      }
    } catch {
      window.alert('No se pudo abrir una de las fotos. Prueba con otra.');
    } finally {
      setPreparando(null);
    }
  };

  const validar = (): string[] => {
    const lista: string[] = [];
    if (!modulo) lista.push('Elige la escuela.');
    if (!evento.trim()) lista.push('Escribe el nombre del evento.');
    if (!agrupaciones.trim()) lista.push('Escribe las agrupaciones participantes.');
    if (!(Number(alumnos) > 0)) lista.push('Escribe cuántos alumnos participaron.');
    if (!instructores.trim()) lista.push('Escribe el nombre del o los instructores.');
    if (dias.length === 0) lista.push('Marca al menos un día de clase.');
    for (const d of dias) {
      const nombre = diaCorto(d.fecha);
      if (!d.horaInicio || !d.horaFin) lista.push(`${nombre}: indica la hora de inicio y de fin.`);
      else if (d.horaFin <= d.horaInicio) lista.push(`${nombre}: la hora de fin debe ser después de la de inicio. Revisa am / pm.`);
      if (!d.descripcion.trim()) lista.push(`${nombre}: escribe qué se trabajó en la clase.`);
    }
    return lista;
  };

  const datos = (): DatosInforme => ({
    modulo,
    escuela,
    semana,
    evento: evento.trim(),
    agrupaciones: agrupaciones.trim(),
    instructores: instructores.trim(),
    responsable: sesion.nombre,
    alumnos: Number(alumnos),
    telefonos: sesion.telefonosNucleo || INFORME_PSB.telefonosPorDefecto,
    dias,
  });

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const lista = validar();
    setErrores(lista);
    if (lista.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    let documento: DocumentoListo | null = null;
    try {
      setEstado({ tipo: 'enviando', avance: 'Armando el documento…' });
      documento = await armarDocumento(datos());
      await enviarInforme(datos(), documento, (avance) => setEstado({ tipo: 'enviando', avance }));
      setEstado({ tipo: 'listo', documento });
      onEnviado();
    } catch (err) {
      setEstado({
        tipo: 'error',
        documento,
        mensaje:
          err instanceof TypeError
            ? 'No hay conexión con el servicio. Revisa tu internet e inténtalo de nuevo.'
            : err instanceof Error
              ? err.message
              : 'No se pudo enviar el informe.',
      });
    }
  };

  if (estado.tipo === 'listo') {
    return (
      <div className="constancia-enviada informe-listo">
        <h2>¡Informe enviado!</h2>
        <p>
          El informe de <strong>{escuela}</strong> ({textoSemana(semana)}) y sus fotos quedaron guardados en el Drive de
          la coordinación.
        </p>
        <div className="admin-acciones">
          <button type="button" className="btn btn-primary" onClick={() => descargar(estado.documento.blob, estado.documento.nombre)}>
            Descargar el Word
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setDias([]);
              setAlumnos('');
              setEstado({ tipo: 'editando' });
            }}
          >
            Hacer otro informe
          </button>
        </div>
      </div>
    );
  }

  const enviando = estado.tipo === 'enviando';

  return (
    <form className="constancia-form informe-psb" onSubmit={enviar} noValidate>
      <h2>Informe semanal</h2>
      <p className="fechas-ayuda">
        Se arma el Word con el formato del núcleo (datos, descripción y memoria fotográfica) y se guarda con las fotos en el
        Drive de la coordinación.
      </p>

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
        <h3>Escuela y semana</h3>
        <div className="campos-grid">
          <div>
            <label htmlFor="psb-escuela">Escuela</label>
            <select id="psb-escuela" value={modulo} onChange={(e) => setModulo(e.target.value)}>
              {sesion.modulos.length > 1 && <option value="">Selecciona…</option>}
              {sesion.modulos.map((id) => (
                <option key={id} value={id}>
                  {nombreEnCatalogo(MODULOS_PSB, id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="psb-semana">Semana</label>
            <select id="psb-semana" value={semana} onChange={(e) => cambiarSemana(e.target.value)}>
              {semanas.map((s) => (
                <option key={s.lunes} value={s.lunes}>
                  {s.texto}
                </option>
              ))}
            </select>
          </div>
        </div>
        {yaEnviado && (
          <p className="aviso-info">
            Ya se envió el informe de esta escuela para esta semana
            {yaEnviado.profesor ? ` (por ${yaEnviado.profesor})` : ''}. Si lo envías de nuevo, lo reemplaza junto con sus
            fotos.
          </p>
        )}
      </section>

      <section>
        <h3>Datos del evento</h3>
        <div className="campos-grid">
          <div>
            <label htmlFor="psb-evento">Nombre del evento</label>
            <input id="psb-evento" type="text" value={evento} onChange={(e) => setEvento(e.target.value)} />
          </div>
          <div>
            <label htmlFor="psb-agrupaciones">Agrupaciones participantes</label>
            <input
              id="psb-agrupaciones"
              type="text"
              placeholder="Ej: Básica"
              value={agrupaciones}
              onChange={(e) => setAgrupaciones(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="psb-alumnos">Cantidad de alumnos</label>
            <input
              id="psb-alumnos"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Ej: 155"
              value={alumnos}
              onChange={(e) => setAlumnos(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="psb-instructores">Instructor(es)</label>
            <input id="psb-instructores" type="text" value={instructores} onChange={(e) => setInstructores(e.target.value)} />
            <p className="fechas-ayuda">Si dieron la clase entre varios, escribe los nombres separados por coma.</p>
          </div>
        </div>
      </section>

      <section>
        <h3>Días de clase</h3>
        <fieldset className="opciones-botones dias-semana">
          <legend>¿Qué días diste clase?</legend>
          {diasHabiles(semana).map((fecha) => {
            const marcado = dias.some((d) => d.fecha === fecha);
            return (
              <label key={fecha} className={marcado ? 'activo' : ''}>
                <input type="checkbox" checked={marcado} onChange={() => alternarDia(fecha)} />
                {diaCorto(fecha)}
              </label>
            );
          })}
        </fieldset>

        {dias.map((d) => (
          <div key={d.fecha} className="dia-clase" data-fecha={d.fecha}>
            <h4>{diaCorto(d.fecha)}</h4>
            <div className="horario-fila">
              <div className="horario-celda">
                <span>Desde</span>
                <CampoHora
                  id={`psb-${d.fecha}-inicio`}
                  value={d.horaInicio}
                  onChange={(v) => cambiarDia(d.fecha, { horaInicio: v })}
                  etiqueta={`${diaCorto(d.fecha)}, desde`}
                />
              </div>
              <div className="horario-celda">
                <span>Hasta</span>
                <CampoHora
                  id={`psb-${d.fecha}-fin`}
                  value={d.horaFin}
                  onChange={(v) => cambiarDia(d.fecha, { horaFin: v })}
                  etiqueta={`${diaCorto(d.fecha)}, hasta`}
                />
              </div>
            </div>

            <label htmlFor={`psb-${d.fecha}-descripcion`}>¿Qué se trabajó en la clase?</label>
            <textarea
              id={`psb-${d.fecha}-descripcion`}
              placeholder="Ej: Ejercicios de respiración y vocalización, Himno Nacional, Burrito sabanero…"
              value={d.descripcion}
              onChange={(e) => cambiarDia(d.fecha, { descripcion: e.target.value })}
            />

            <p className="dia-fotos-titulo">
              Fotos ({d.fotos.length} de {INFORME_PSB.maxFotosPorDia})
            </p>
            {d.fotos.length > 0 && (
              <ul className="fotos-dia">
                {d.fotos.map((f, i) => (
                  <li key={f.clave}>
                    <img src={f.dataUrl} alt={`Foto ${i + 1} del ${diaCorto(d.fecha)}`} />
                    <button
                      type="button"
                      className="btn btn-peligro-suave btn-sm"
                      onClick={() => cambiarDia(d.fecha, { fotos: d.fotos.filter((x) => x.clave !== f.clave) })}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {d.fotos.length < INFORME_PSB.maxFotosPorDia && (
              <label className="btn btn-secondary boton-fotos">
                {preparando === d.fecha ? 'Preparando fotos…' : '+ Agregar fotos'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  disabled={preparando !== null}
                  onChange={(e) => {
                    void agregarFotos(d.fecha, e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
        ))}
      </section>

      {estado.tipo === 'error' && (
        <div className="alert-error" role="alert">
          <p>{estado.mensaje}</p>
          {estado.documento && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => estado.documento && descargar(estado.documento.blob, estado.documento.nombre)}
            >
              Descargar el Word de todas formas
            </button>
          )}
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-bloque" disabled={enviando || preparando !== null}>
        {enviando ? estado.avance : 'Generar y enviar informe'}
      </button>
    </form>
  );
}
