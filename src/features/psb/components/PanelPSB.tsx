import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { diaCorto, hoyIso, rangoHoras } from '../../constancias/lib/textoConstancia';
import { MODULOS_PSB, nombreEnCatalogo } from '../../../lib/datosEstaticos';
import type { SesionProfesor } from '../../../lib/profesorAuth';
import { descargarInformePSB, listarMisInformesPSB, quitarDiaPSB } from '../api/psb.api';
import { diasHabiles, semanasRecientes } from '../lib/fechas';
import { mensajeTelegram } from '../lib/mensaje';
import { listarPendientes, quitarPendiente, type ClasePendiente } from '../lib/cola';
import { EVENTO_ENVIADA, EVENTO_PENDIENTES, enviarPendientesAhora, iniciarEnvioAutomatico } from '../lib/envioAutomatico';
import type { DiaPSB, InformePSB } from '../tipos';
import { ClaseForm } from './ClaseForm';
import { ListaInformesPSB } from './ListaInformesPSB';
import { WordSemana } from './WordSemana';

type Vista = 'semana' | 'lista';

/**
 * Programa Simón Bolívar: el formador reporta cada clase el mismo día (con el
 * mensaje para Telegram) y al final de la semana arma el Word con esas clases.
 */
export function PanelPSB({ sesion }: { sesion: SesionProfesor }) {
  const semanas = semanasRecientes();
  const [vista, setVista] = useState<Vista>('semana');
  const [modulo, setModulo] = useState(sesion.modulos[0] ?? '');
  const [semana, setSemana] = useState(semanas[0].lunes);
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const queryClient = useQueryClient();
  const clave = ['psb-mis-informes', sesion.cedula];
  const informes = useQuery({ queryKey: clave, queryFn: listarMisInformesPSB });
  const [pendientes, setPendientes] = useState<ClasePendiente[]>([]);
  const [enviando, setEnviando] = useState(false);

  const leerPendientes = useCallback(() => {
    listarPendientes(sesion.cedula)
      .then(setPendientes)
      .catch(() => setPendientes([]));
  }, [sesion.cedula]);

  const escuela = nombreEnCatalogo(MODULOS_PSB, modulo);
  const informe = informes.data?.find((i) => i.modulo === modulo && i.semana === semana);
  const hoy = hoyIso();

  /** Clases de esa escuela, de la más reciente a la más antigua. */
  const clasesDeLaEscuela = (informes.data ?? [])
    .filter((i) => i.modulo === modulo)
    .flatMap((i) => i.dias)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const anteriorA = (fecha: string): DiaPSB | undefined => clasesDeLaEscuela.find((d) => d.fecha < fecha) ?? clasesDeLaEscuela[0];
  const agrupacionesAnteriores = (informes.data ?? [])
    .filter((i) => i.modulo === modulo && i.agrupaciones)
    .sort((a, b) => b.semana.localeCompare(a.semana))[0]?.agrupaciones;

  /** Pone la semana que devolvió el servicio en la lista, sin volver a pedirla. */
  const actualizar = useCallback(
    (inf: InformePSB) =>
      queryClient.setQueryData<InformePSB[]>(['psb-mis-informes', sesion.cedula], (previas = []) => [
        ...previas.filter((i) => !(i.modulo === inf.modulo && i.semana === inf.semana)),
        inf,
      ]),
    [queryClient, sesion.cedula]
  );

  // Clases guardadas en el teléfono: se actualizan cuando cambian o se envían solas.
  useEffect(() => {
    iniciarEnvioAutomatico(); // por si acaba de entrar (sin recargar la página)
    leerPendientes();
    const alEnviar = (e: Event) => {
      actualizar((e as CustomEvent<{ semana: InformePSB }>).detail.semana);
      setAviso(''); // «todavía no hay conexión» ya no aplica
    };
    window.addEventListener(EVENTO_PENDIENTES, leerPendientes);
    window.addEventListener(EVENTO_ENVIADA, alEnviar);
    return () => {
      window.removeEventListener(EVENTO_PENDIENTES, leerPendientes);
      window.removeEventListener(EVENTO_ENVIADA, alEnviar);
    };
  }, [leerPendientes, actualizar]);

  const pendientesDeSemana = pendientes.filter((p) => p.modulo === modulo && p.semana === semana);
  const pendienteDe = (fecha: string) => pendientesDeSemana.find((p) => p.dia.fecha === fecha);

  const enviarAhora = async () => {
    setEnviando(true);
    await enviarPendientesAhora();
    setEnviando(false);
    const quedan = (await listarPendientes(sesion.cedula)).filter((p) => !p.error).length;
    setAviso(quedan ? 'Todavía no hay conexión con el servicio. Se enviarán solas apenas haya internet.' : 'Clases enviadas ✓');
  };

  const descartar = async (p: ClasePendiente) => {
    if (!window.confirm(`¿Descartar la clase del ${diaCorto(p.dia.fecha)} guardada en el teléfono?`)) return;
    await quitarPendiente(p.clave);
    leerPendientes();
  };

  const lider = () => {
    if (sesion.liderPSB) return sesion.liderPSB;
    try {
      return localStorage.getItem('psb_lider') ?? '';
    } catch {
      return '';
    }
  };

  const copiarMensaje = async (dia: DiaPSB) => {
    const texto = mensajeTelegram(dia, { escuela, formador: dia.formador || sesion.nombre, lider: lider() });
    try {
      await navigator.clipboard.writeText(texto);
      setAviso(`Mensaje del ${diaCorto(dia.fecha)} copiado: pégalo en Telegram.`);
    } catch {
      window.prompt('Copia el mensaje:', texto);
    }
  };

  const quitar = async (dia: DiaPSB) => {
    if (!window.confirm(`¿Quitar la clase del ${diaCorto(dia.fecha)}? Sus fotos se borran del Drive.`)) return;
    try {
      actualizar(await quitarDiaPSB({ modulo, semana, fecha: dia.fecha }));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo quitar la clase.');
    }
  };

  const nav = (
    <nav className="app-nav" aria-label="Informes Simón Bolívar">
      <button
        type="button"
        className={`nav-btn ${vista === 'semana' ? 'activo' : ''}`}
        aria-pressed={vista === 'semana'}
        onClick={() => setVista('semana')}
      >
        Reportar clases
      </button>
      <button
        type="button"
        className={`nav-btn ${vista === 'lista' ? 'activo' : ''}`}
        aria-pressed={vista === 'lista'}
        onClick={() => {
          setEditando(null);
          void informes.refetch();
          setVista('lista');
        }}
      >
        Mis semanas
      </button>
    </nav>
  );

  if (vista === 'lista') {
    return (
      <>
        {nav}
        <ListaInformesPSB
          informes={informes.data ?? []}
          cargando={informes.isLoading}
          error={informes.error}
          descargarWord={descargarInformePSB}
        />
      </>
    );
  }

  if (editando) {
    const guardada = informe?.dias.find((d) => d.fecha === editando);
    const pendiente = pendienteDe(editando);
    return (
      <ClaseForm
        key={editando}
        pendiente={pendiente}
        sesion={sesion}
        modulo={modulo}
        escuela={escuela}
        semana={semana}
        fecha={editando}
        guardada={guardada}
        anterior={guardada || pendiente ? undefined : anteriorA(editando)}
        onGuardada={actualizar}
        onVolver={() => setEditando(null)}
      />
    );
  }

  return (
    <>
      {nav}
      <section className="psb-semana">
        <div className="campos-grid">
          <div>
            <label htmlFor="psb-escuela">Escuela</label>
            <select id="psb-escuela" value={modulo} onChange={(e) => setModulo(e.target.value)}>
              {sesion.modulos.map((id) => (
                <option key={id} value={id}>
                  {nombreEnCatalogo(MODULOS_PSB, id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="psb-semana">Semana</label>
            <select id="psb-semana" value={semana} onChange={(e) => setSemana(e.target.value)}>
              {semanas.map((s) => (
                <option key={s.lunes} value={s.lunes}>
                  {s.texto}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h3>Clases de la semana</h3>
        <p className="fechas-ayuda">
          Reporta cada clase el mismo día: se guarda con sus fotos y te deja el mensaje listo para Telegram.
        </p>
        {informes.isLoading && <p>Cargando…</p>}
        {informes.error != null && (
          <div className="alert-error">
            {informes.error instanceof Error ? informes.error.message : 'No se pudieron cargar tus clases.'}
          </div>
        )}
        {aviso && <p className="aviso-info">{aviso}</p>}
        {pendientesDeSemana.some((p) => !p.error) && (
          <div className="aviso-info aviso-alerta pendientes-aviso">
            <p>
              {pendientesDeSemana.filter((p) => !p.error).length === 1
                ? 'Hay 1 clase guardada en este teléfono que todavía no llega al servicio.'
                : `Hay ${pendientesDeSemana.filter((p) => !p.error).length} clases guardadas en este teléfono que todavía no llegan al servicio.`}{' '}
              Se envían solas apenas haya internet.
            </p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={enviarAhora} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar ahora'}
            </button>
          </div>
        )}

        <ul className="semana-dias">
          {diasHabiles(semana).map((fecha) => {
            const enviado = informe?.dias.find((d) => d.fecha === fecha);
            const pendiente = pendienteDe(fecha);
            // Lo del teléfono es lo más reciente (aún no llega al servicio).
            const dia: DiaPSB | undefined = pendiente
              ? { ...pendiente.dia, fotos: pendiente.fotoNueva ? [{ id: '', url: '', nombre: 'foto' }] : pendiente.fotosGuardadas }
              : enviado;
            const futuro = fecha > hoy;
            return (
              <li key={fecha} className={pendiente ? 'pendiente' : dia ? 'guardado' : ''} data-fecha={fecha}>
                <div>
                  <strong>
                    {pendiente ? '⏳ ' : dia ? '✓ ' : ''}
                    {diaCorto(fecha)}
                  </strong>
                  {pendiente && (
                    <span className={pendiente.error ? 'error' : 'pendiente-estado'}>
                      {pendiente.error ? `No se pudo enviar: ${pendiente.error}` : 'En el teléfono: se envía cuando haya internet'}
                    </span>
                  )}
                  <span className="fechas-ayuda">
                    {dia
                      ? `${rangoHoras(dia.horaInicio, dia.horaFin)} · ${dia.atendidos} · ${dia.fotos.length ? 'con foto' : 'sin foto'}${dia.formador && dia.formador !== sesion.nombre ? ` · ${dia.formador}` : ''}`
                      : futuro
                        ? 'Todavía no'
                        : 'Sin reportar'}
                  </span>
                </div>
                <div className="admin-acciones">
                  {dia ? (
                    <>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => copiarMensaje(dia)}>
                        Copiar mensaje
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditando(fecha)}>
                        Corregir
                      </button>
                      {pendiente ? (
                        <button type="button" className="btn btn-peligro-suave btn-sm" onClick={() => descartar(pendiente)}>
                          Descartar
                        </button>
                      ) : (
                        <button type="button" className="btn btn-peligro-suave btn-sm" onClick={() => quitar(dia)}>
                          Quitar
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={futuro || !modulo}
                      onClick={() => {
                        setAviso('');
                        setEditando(fecha);
                      }}
                    >
                      Reportar clase
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {informe && informe.dias.length > 0 && pendientesDeSemana.length > 0 && (
        <section className="word-semana">
          <h3>Word de la semana</h3>
          <p className="aviso-info aviso-alerta">
            Faltan clases por llegar al servicio. El Word se puede armar cuando se hayan enviado todas.
          </p>
        </section>
      )}
      {informe && informe.dias.length > 0 && pendientesDeSemana.length === 0 && (
        <WordSemana
          key={`${informe.modulo}-${informe.semana}`}
          sesion={sesion}
          informe={informe}
          agrupacionesAnteriores={agrupacionesAnteriores}
          onActualizado={actualizar}
        />
      )}
    </>
  );
}
