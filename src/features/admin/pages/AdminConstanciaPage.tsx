import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import { CampoFecha } from '../../constancias/components/CampoFecha';
import { CamposSolicitud } from '../../constancias/components/CamposSolicitud';
import { ConstanciaDocumento, HojaEscalada } from '../../constancias/components/ConstanciaDocumento';
import { FIRMANTE } from '../../constancias/config';
import { eliminarSolicitud, guardarSolicitud, listarSolicitudes } from '../../constancias/api/constancias.api';
import { fechaLegible, hoyIso } from '../../constancias/lib/textoConstancia';
import { enlaceWhatsApp, mensajeParaRepresentante, nombreArchivoPdf } from '../../constancias/lib/utilidades';
import {
  descargarArchivo,
  generarPdfConstancia,
  puedeCompartirArchivos,
} from '../../constancias/pdf/generarPdf';
import {
  ESTADOS_CONSTANCIA,
  SOLICITUD_VACIA,
  datosDeSolicitud,
  limpiarSolicitud,
  tituloTipo,
  type Constancia,
  type DatosSolicitud,
  type EntregaConstancia,
  type EstadoConstancia,
} from '../../constancias/types/constancia.types';

const BASE = import.meta.env.BASE_URL;

/** Constancia que hace la coordinación desde cero: el código lo asigna el servicio al guardar. */
function constanciaNueva(): Constancia {
  return {
    ...SOLICITUD_VACIA,
    codigo: '',
    creadoEn: new Date().toISOString(),
    estado: 'pendiente',
    fechaEmision: hoyIso(),
    parrafoAdicional: '',
    entrega: 'representante',
    motivoRechazo: '',
    actualizadoEn: '',
  };
}

/** Revisión de una constancia: /admin/constancias/:codigo o /admin/constancias/nueva */
export function AdminConstanciaPage({ nueva = false }: { nueva?: boolean }) {
  return <AccesoCoordinacion>{(clave) => <Cargador clave={clave} nueva={nueva} />}</AccesoCoordinacion>;
}

function Cargador({ clave, nueva }: { clave: string; nueva: boolean }) {
  const { codigo } = useParams<{ codigo: string }>();
  // Misma consulta que la bandeja: al venir de la lista, no se vuelve a pedir.
  const lista = useQuery({
    queryKey: ['admin-constancias'],
    queryFn: () => listarSolicitudes(clave),
    enabled: !nueva,
  });

  if (nueva) return <RevisionConstancia inicial={constanciaNueva()} clave={clave} />;
  if (lista.isLoading) return <p>Abriendo solicitud…</p>;

  const constancia = lista.data?.find((c) => c.codigo === codigo?.toUpperCase());
  if (!constancia) {
    return (
      <div className="admin-dashboard">
        <div className="alert-error">
          {lista.error instanceof Error ? lista.error.message : `No existe la solicitud ${codigo}.`}
        </div>
        <Link to="/admin/constancias" className="btn btn-secondary">Volver a constancias</Link>
      </div>
    );
  }
  return <RevisionConstancia key={constancia.codigo} inicial={constancia} clave={clave} />;
}

interface RevisionProps {
  inicial: Constancia;
  clave: string;
}

/** Solo en pantallas angostas: cierra la sección abierta desde «Más opciones». */
function BotonCerrarPanel({ onCerrar }: { onCerrar: () => void }) {
  return (
    <button type="button" className="btn-link cerrar-panel solo-angosta" onClick={onCerrar}>
      ✕ Cerrar
    </button>
  );
}

/** Secciones que en pantallas angostas se abren desde «Más opciones». */
type Panel = 'previa' | 'datos' | 'parrafo' | 'rechazo';

const PANELES: { id: Panel; texto: string }[] = [
  { id: 'previa', texto: 'Ver vista previa' },
  { id: 'datos', texto: 'Editar datos de la solicitud' },
  { id: 'parrafo', texto: 'Párrafo adicional' },
  { id: 'rechazo', texto: 'Rechazar solicitud' },
];

function RevisionConstancia({ inicial, clave }: RevisionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<DatosSolicitud>({ defaultValues: datosDeSolicitud({ ...inicial }) });
  const [codigo, setCodigo] = useState(inicial.codigo);
  const [estado, setEstado] = useState<EstadoConstancia>(inicial.estado);
  const [fechaEmision, setFechaEmision] = useState(inicial.fechaEmision || hoyIso());
  const [parrafoAdicional, setParrafoAdicional] = useState(inicial.parrafoAdicional);
  const [entrega, setEntrega] = useState<EntregaConstancia>(inicial.entrega);
  const [precio, setPrecio] = useState(inicial.precio ?? '');
  const [motivoRechazo, setMotivoRechazo] = useState(inicial.motivoRechazo);
  const [ocupado, setOcupado] = useState(false);
  const [pdf, setPdf] = useState<{ blob: Blob; nombre: string; huella: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // En pantallas angostas solo se ve lo principal; el resto se abre desde «Más opciones».
  const [panel, setPanel] = useState<Panel | null>(inicial.codigo ? null : 'datos');
  const [menu, setMenu] = useState(false);
  const compartir = puedeCompartirArchivos();
  const esNueva = !codigo;

  const alternarPanel = (id: Panel) => {
    setPanel((actualPanel) => (actualPanel === id ? null : id));
    setMenu(false);
    requestAnimationFrame(() =>
      document.querySelector(`[data-seccion="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  /** Al aprobar o guardar con datos incompletos, se abre la sección y se lleva al primer error. */
  const alInvalidar = () => {
    setPanel('datos');
    setError('Hay datos por completar o corregir en la solicitud (marcados en rojo).');
    setTimeout(
      () => document.querySelector('[data-seccion="datos"] .error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      100
    );
  };

  const datos = limpiarSolicitud(form.watch());
  // El PDF generado deja de servir si se edita algo que sale impreso.
  const huella = JSON.stringify([datos, parrafoAdicional, fechaEmision]);
  const pdfVigente = pdf && pdf.huella === huella ? pdf : null;
  const actual = (nuevoEstado: EstadoConstancia): Constancia => ({
    ...inicial,
    ...limpiarSolicitud(form.getValues()),
    codigo,
    estado: nuevoEstado,
    fechaEmision,
    parrafoAdicional,
    entrega,
    precio: entrega === 'coordinacion' ? precio.trim() : '',
    motivoRechazo: nuevoEstado === 'rechazada' ? motivoRechazo.trim() : '',
  });

  /** Guarda en el servicio. Una constancia nueva recibe aquí su código. */
  const persistir = async (nuevoEstado: EstadoConstancia): Promise<Constancia> => {
    const guardada = await guardarSolicitud(actual(nuevoEstado), clave);
    if (!codigo) {
      setCodigo(guardada.codigo);
      window.history.replaceState(null, '', `${BASE}admin/constancias/${guardada.codigo}`);
    }
    setEstado(nuevoEstado);
    await queryClient.invalidateQueries({ queryKey: ['admin-constancias'] });
    return guardada;
  };

  const conEspera = async (tarea: () => Promise<void>) => {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      await tarea();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción.');
    } finally {
      setOcupado(false);
    }
  };

  /**
   * Paso 1: valida, la marca aprobada y genera el PDF. Compartir/abrir van en un
   * segundo toque: el navegador los bloquea si no siguen directo a un clic.
   */
  const aprobar = form.handleSubmit(
    () =>
      conEspera(async () => {
        const c = await persistir('aprobada');
        const blob = await generarPdfConstancia({ datos: c, codigo: c.codigo, firmante: FIRMANTE, fechaEmision });
        setPdf({ blob, nombre: nombreArchivoPdf(c), huella });
        setAviso('Constancia aprobada. Elige cómo entregarla.');
      }),
    alInvalidar
  );

  const guardar = form.handleSubmit(
    () =>
      conEspera(async () => {
        await persistir(estado);
        setAviso('Cambios guardados.');
      }),
    alInvalidar
  );

  const rechazar = () => {
    if (!motivoRechazo.trim()) {
      setError('Escribe el motivo del rechazo para que el representante sepa qué corregir.');
      return;
    }
    conEspera(async () => {
      await persistir('rechazada');
      setAviso('Solicitud rechazada. Avísale al representante por WhatsApp.');
    });
  };

  const eliminar = () => {
    if (!window.confirm(`¿Eliminar la constancia ${codigo}? No se puede deshacer.`)) return;
    conEspera(async () => {
      await eliminarSolicitud(codigo, clave);
      await queryClient.invalidateQueries({ queryKey: ['admin-constancias'] });
      navigate('/admin/constancias');
    });
  };

  const telefono = datos.representanteTelefono.trim();
  const destinatario = datos.representanteNombre.trim() || datos.estudianteNombre.trim();
  const mensaje = codigo && estado !== 'pendiente' ? mensajeParaRepresentante(actual(estado)) : '';
  // Aprobada para el representante: el mensaje viaja junto con el PDF, no aparte.
  const enviaPdf = entrega === 'representante' && estado === 'aprobada';

  /** PDF y mensaje en un mismo envío (hoja de compartir del celular → WhatsApp). */
  const enviarPdf = async () => {
    if (!pdfVigente) return;
    const archivo = new File([pdfVigente.blob], pdfVigente.nombre, { type: 'application/pdf' });
    // Respaldo: algunas apps descartan el texto al recibir un archivo. Se lanza
    // antes de compartir y sin esperar, para no perder el permiso del clic.
    navigator.clipboard?.writeText(mensaje).catch(() => {});
    try {
      await navigator.share({ files: [archivo], text: mensaje });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError('No se pudo compartir. Descarga el PDF y envíalo manualmente.');
      }
    }
  };

  /** Sin hoja de compartir (PC): descarga el PDF y abre el chat con el mensaje listo. */
  const descargarYAbrirChat = () => {
    if (!pdfVigente) return;
    descargarArchivo(pdfVigente.blob, pdfVigente.nombre);
    window.open(enlaceWhatsApp(telefono, mensaje), '_blank');
  };

  const abrirParaImprimir = () => {
    if (!pdfVigente) return;
    const url = URL.createObjectURL(pdfVigente.blob);
    if (!window.open(url, '_blank')) descargarArchivo(pdfVigente.blob, pdfVigente.nombre);
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  };

  // Rechazo o retiro en coordinación: basta un aviso de texto.
  const avisoTexto = mensaje && telefono && !enviaPdf ? enlaceWhatsApp(telefono, mensaje) : null;

  return (
    <div className={`admin-dashboard revision${inicial.codigo ? '' : ' desde-cero'}`} data-panel={panel ?? ''}>
      <div className="admin-edit-header">
        <div>
          <Link to="/admin/constancias" className="admin-back-link">← Volver a constancias</Link>
          <h2>{esNueva ? 'Nueva constancia' : `${codigo} — ${tituloTipo(datos.tipo)}`}</h2>
          {inicial.codigo && (
            <p className="fechas-ayuda">
              Solicitada el {fechaLegible(inicial.creadoEn)}
              {` por ${inicial.representanteNombre || inicial.estudianteNombre}`} ·{' '}
              <span className={`estado-badge ${estado}`}>{ESTADOS_CONSTANCIA[estado]}</span>
            </p>
          )}
          {datos.estudianteNombre.trim() && (
            <p className="revision-resumen">
              <strong>{datos.estudianteNombre}</strong>
              {datos.agrupacionNombre.trim() && ` · ${datos.agrupacionNombre}`}
            </p>
          )}
        </div>
      </div>

      {aviso && <div className="alert-success">{aviso}</div>}
      {error && <div className="alert-error">{error}</div>}

      <div className="revision-grid">
        <form className="constancia-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <section className="panel-coordinacion">
            <h3>Decisión de la coordinación</h3>

            <label htmlFor="fechaEmision">Fecha de emisión</label>
            {/* Mientras se escribe incompleta se mantiene la fecha anterior. */}
            <CampoFecha id="fechaEmision" value={fechaEmision} onChange={(v) => v && setFechaEmision(v)} />

            <fieldset className="opciones-impresion">
              <legend>¿Quién imprime?</legend>
              <label>
                <input
                  type="radio"
                  checked={entrega === 'representante'}
                  onChange={() => setEntrega('representante')}
                />
                Se envía el PDF al representante y él la imprime
              </label>
              <label>
                <input
                  type="radio"
                  checked={entrega === 'coordinacion'}
                  onChange={() => setEntrega('coordinacion')}
                />
                La coordinación la imprime, firma y entrega
              </label>
            </fieldset>

            {entrega === 'coordinacion' && (
              <div className="campo-precio">
                <label htmlFor="precio">Costo al retirarla (opcional)</label>
                <input
                  id="precio"
                  type="text"
                  placeholder="Ej.: 5 $ o 200 Bs"
                  maxLength={40}
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                />
                <p className="fechas-ayuda">Se indica en el mensaje al representante; no sale en la constancia.</p>
              </div>
            )}

            <div data-seccion="parrafo">
              <label htmlFor="parrafoAdicional">Párrafo adicional (opcional)</label>
              <textarea
                id="parrafoAdicional"
                placeholder="Texto que se agrega antes del cierre. Deja una línea en blanco para separar párrafos."
                value={parrafoAdicional}
                onChange={(e) => setParrafoAdicional(e.target.value)}
              />
            </div>

            <div className="revision-acciones">
              {!pdfVigente ? (
                <button type="button" className="btn btn-primary" onClick={aprobar} disabled={ocupado}>
                  {ocupado ? 'Guardando…' : estado === 'aprobada' ? 'Generar PDF' : 'Aprobar y generar PDF'}
                </button>
              ) : (
                <>
                  {enviaPdf && compartir && (
                    <button type="button" className="btn btn-primary" onClick={enviarPdf}>
                      Enviar por WhatsApp
                    </button>
                  )}
                  {enviaPdf && !compartir && telefono && (
                    <button type="button" className="btn btn-primary" onClick={descargarYAbrirChat}>
                      Descargar PDF y abrir WhatsApp
                    </button>
                  )}
                  {entrega === 'coordinacion' && (
                    <button type="button" className="btn btn-primary" onClick={abrirParaImprimir}>
                      Abrir para imprimir
                    </button>
                  )}
                  {!(enviaPdf && !compartir && telefono) && (
                    <button
                      type="button"
                      className={`btn ${enviaPdf && !compartir ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => descargarArchivo(pdfVigente.blob, pdfVigente.nombre)}
                    >
                      Descargar PDF
                    </button>
                  )}
                </>
              )}
              {avisoTexto && (
                <a className="btn btn-secondary" href={avisoTexto} target="_blank" rel="noreferrer">
                  Avisar al representante
                </a>
              )}
              {/* Celular: la vista previa a mano, para revisar antes de aprobar. */}
              <button type="button" className="btn btn-secondary solo-angosta" onClick={() => alternarPanel('previa')}>
                {panel === 'previa' ? 'Ocultar la constancia' : 'Ver cómo queda la constancia'}
              </button>
            </div>
            {pdfVigente && enviaPdf && compartir && (
              <p className="fechas-ayuda">
                En WhatsApp elige el chat de {destinatario}
                {telefono && (
                  <>
                    {' '}
                    (<span style={{ whiteSpace: 'nowrap' }}>{telefono}</span>)
                  </>
                )}
                : el PDF va con el mensaje. El mensaje también queda copiado por si
                no aparece.
              </p>
            )}
            {pdfVigente && enviaPdf && !compartir && telefono && (
              <p className="fechas-ayuda">
                Se descarga el PDF y se abre el chat con el mensaje listo: arrastra el PDF al chat antes de enviar.
              </p>
            )}
            <p className="fechas-ayuda">La constancia sale con la línea para firma y sello a mano.</p>

            {/* Celular: lo secundario se abre desde aquí. */}
            <div className="revision-menu solo-angosta">
              <button
                type="button"
                className="btn btn-secondary revision-menu-boton"
                aria-expanded={menu}
                onClick={() => setMenu((v) => !v)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Más opciones
              </button>
              {menu && (
                <div className="revision-menu-lista" role="menu">
                  {PANELES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="menuitem"
                      className={panel === p.id ? 'activo' : ''}
                      onClick={() => alternarPanel(p.id)}
                    >
                      {panel === p.id ? `Ocultar: ${p.texto.toLowerCase()}` : p.texto}
                    </button>
                  ))}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={ocupado}
                    onClick={() => {
                      setMenu(false);
                      guardar();
                    }}
                  >
                    Guardar cambios
                  </button>
                  {!esNueva && (
                    <button
                      type="button"
                      role="menuitem"
                      className="peligro"
                      disabled={ocupado}
                      onClick={() => {
                        setMenu(false);
                        eliminar();
                      }}
                    >
                      Eliminar constancia
                    </button>
                  )}
                </div>
              )}
            </div>

            <div data-seccion="rechazo" className="caja-rechazo">
              <h4>¿No se puede aprobar?</h4>
              <label htmlFor="motivoRechazo">Motivo del rechazo (se le dirá al representante)</label>
              <input
                id="motivoRechazo"
                type="text"
                placeholder="Ej: El estudiante no pertenece a esa agrupación"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
              />
              <div className="revision-acciones">
                <button type="button" className="btn btn-danger" onClick={rechazar} disabled={ocupado}>
                  Rechazar solicitud
                </button>
              </div>
            </div>

            <div className="revision-acciones caja-gestion" data-seccion="gestion">
              <button type="button" className="btn btn-secondary" onClick={guardar} disabled={ocupado}>
                Guardar cambios
              </button>
              {!esNueva && (
                <button type="button" className="btn btn-peligro-suave" onClick={eliminar} disabled={ocupado}>
                  Eliminar constancia
                </button>
              )}
            </div>

            {inicial.notas && (
              <p className="nota-representante">
                <strong>Nota del representante:</strong> {inicial.notas}
              </p>
            )}
          </section>

          <div data-seccion="datos">
            {/* En una constancia desde cero los datos son lo principal: no se ocultan. */}
            {inicial.codigo && <BotonCerrarPanel onCerrar={() => setPanel(null)} />}
            <CamposSolicitud form={form} modo="coordinacion" />
          </div>
        </form>

        <aside className="revision-vista" data-seccion="previa">
          <div className="revision-vista-titulo">
            <h3>Vista previa</h3>
            <BotonCerrarPanel onCerrar={() => setPanel(null)} />
          </div>
          <HojaEscalada>
            <ConstanciaDocumento
              datos={{ ...datos, parrafoAdicional }}
              codigo={codigo || 'CT00-PENDIENTE'}
              firmante={FIRMANTE}
              fechaEmision={fechaEmision}
            />
          </HojaEscalada>
        </aside>
      </div>
    </div>
  );
}
