import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AdminLogin } from '../components/AdminLogin';
import { isAdminAuthenticated } from '../../../lib/adminAuth';
import { CamposSolicitud } from '../../constancias/components/CamposSolicitud';
import { ConstanciaDocumento, HojaEscalada } from '../../constancias/components/ConstanciaDocumento';
import { FIRMANTE } from '../../constancias/config';
import { decodificarSolicitud, generarCodigo, solicitudDelHash } from '../../constancias/lib/enlaceSolicitud';
import {
  buscarEnHistorial,
  eliminarDelHistorial,
  guardarEnHistorial,
} from '../../constancias/lib/historial';
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
  limpiarSegunTipo,
  tituloTipo,
  type Constancia,
  type DatosSolicitud,
  type EntregaConstancia,
  type EstadoConstancia,
  type Solicitud,
} from '../../constancias/types/constancia.types';

type Origen = 'enlace' | 'nueva' | 'historial';

function nuevaConstancia(s: Solicitud): Constancia {
  return {
    ...s,
    estado: 'pendiente',
    fechaEmision: hoyIso(),
    parrafoAdicional: '',
    entrega: 'representante',
    motivoRechazo: '',
    actualizadoEn: new Date().toISOString(),
  };
}

/**
 * Revisión de una constancia. Llega de tres formas: el enlace de WhatsApp del
 * representante (#s=…), "Nueva constancia" o el historial de este dispositivo.
 */
export function AdminConstanciaPage({ origen }: { origen: Origen }) {
  const { codigo } = useParams<{ codigo: string }>();
  const { hash } = useLocation();
  const [autenticado, setAutenticado] = useState(isAdminAuthenticated());
  const [constancia, setConstancia] = useState<Constancia | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autenticado) return;
    let vigente = true;
    const cargar = async (): Promise<Constancia> => {
      if (origen === 'nueva') {
        return nuevaConstancia({ ...SOLICITUD_VACIA, codigo: generarCodigo(), creadoEn: new Date().toISOString() });
      }
      if (origen === 'historial') {
        const guardada = buscarEnHistorial(codigo ?? '');
        if (!guardada) throw new Error('Esta constancia no está en el historial de este dispositivo.');
        return guardada;
      }
      const codificada = solicitudDelHash(hash);
      if (!codificada) throw new Error('El enlace no trae ninguna solicitud.');
      const solicitud = await decodificarSolicitud(codificada);
      // Si ya se abrió antes en este dispositivo, se retoma lo revisado.
      const previa = buscarEnHistorial(solicitud.codigo);
      if (previa) return previa;
      const recibida = nuevaConstancia(solicitud);
      guardarEnHistorial(recibida);
      return recibida;
    };
    cargar()
      .then((c) => vigente && setConstancia(c))
      .catch((err) => vigente && setError(err instanceof Error ? err.message : 'No se pudo abrir la solicitud.'));
    return () => {
      vigente = false;
    };
  }, [autenticado, origen, codigo, hash]);

  if (!autenticado) {
    return <AdminLogin onLogin={() => setAutenticado(true)} />;
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="alert-error">{error}</div>
        <Link to="/admin/constancias" className="btn btn-secondary">Volver a constancias</Link>
      </div>
    );
  }

  if (!constancia) return <p>Abriendo solicitud...</p>;

  return <RevisionConstancia key={constancia.codigo} inicial={constancia} esNueva={origen === 'nueva'} />;
}

interface RevisionProps {
  inicial: Constancia;
  esNueva: boolean;
}

function RevisionConstancia({ inicial, esNueva }: RevisionProps) {
  const navigate = useNavigate();
  const form = useForm<DatosSolicitud>({ defaultValues: datosDeSolicitud({ ...inicial }) });
  const [estado, setEstado] = useState<EstadoConstancia>(inicial.estado);
  const [fechaEmision, setFechaEmision] = useState(inicial.fechaEmision || hoyIso());
  const [parrafoAdicional, setParrafoAdicional] = useState(inicial.parrafoAdicional);
  const [entrega, setEntrega] = useState<EntregaConstancia>(inicial.entrega);
  const [motivoRechazo, setMotivoRechazo] = useState(inicial.motivoRechazo);
  const [generando, setGenerando] = useState(false);
  const [pdf, setPdf] = useState<{ blob: Blob; nombre: string; huella: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const compartir = puedeCompartirArchivos();

  const datos = limpiarSegunTipo(form.watch());
  // El PDF generado deja de servir si se edita algo que sale impreso.
  const huella = JSON.stringify([datos, parrafoAdicional, fechaEmision]);
  const pdfVigente = pdf && pdf.huella === huella ? pdf : null;
  const actual = (nuevoEstado: EstadoConstancia): Constancia => ({
    ...inicial,
    ...limpiarSegunTipo(form.getValues()),
    estado: nuevoEstado,
    fechaEmision,
    parrafoAdicional,
    entrega,
    motivoRechazo: nuevoEstado === 'rechazada' ? motivoRechazo.trim() : '',
    actualizadoEn: new Date().toISOString(),
  });

  const registrar = (nuevoEstado: EstadoConstancia, mensaje: string) => {
    guardarEnHistorial(actual(nuevoEstado));
    setEstado(nuevoEstado);
    setAviso(mensaje);
  };

  /**
   * Paso 1: valida, genera el PDF y la marca aprobada. Compartir/abrir van en un
   * segundo toque: el navegador los bloquea si no siguen directo a un clic.
   */
  const aprobar = form.handleSubmit(async () => {
    setGenerando(true);
    setError(null);
    setAviso(null);
    try {
      const c = actual('aprobada');
      const blob = await generarPdfConstancia({ datos: c, codigo: c.codigo, firmante: FIRMANTE, fechaEmision });
      setPdf({ blob, nombre: nombreArchivoPdf(c), huella });
      registrar('aprobada', 'Constancia aprobada. Elige cómo entregarla.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    } finally {
      setGenerando(false);
    }
  });

  const compartirPdf = async () => {
    if (!pdfVigente) return;
    try {
      const archivo = new File([pdfVigente.blob], pdfVigente.nombre, { type: 'application/pdf' });
      await navigator.share({ files: [archivo], title: pdfVigente.nombre });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError('No se pudo compartir. Descarga el PDF y envíalo manualmente.');
      }
    }
  };

  const abrirParaImprimir = () => {
    if (!pdfVigente) return;
    const url = URL.createObjectURL(pdfVigente.blob);
    if (!window.open(url, '_blank')) descargarArchivo(pdfVigente.blob, pdfVigente.nombre);
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  };

  const guardar = () => registrar(estado, 'Cambios guardados en el historial.');

  const rechazar = () => {
    if (!motivoRechazo.trim()) {
      setError('Escribe el motivo del rechazo para que el representante sepa qué corregir.');
      return;
    }
    setError(null);
    registrar('rechazada', 'Solicitud rechazada. Avísale al representante por WhatsApp.');
  };

  const eliminar = () => {
    if (!window.confirm(`¿Quitar la constancia ${inicial.codigo} del historial?`)) return;
    eliminarDelHistorial(inicial.codigo);
    navigate('/admin/constancias');
  };

  const whatsapp =
    estado !== 'pendiente' && datos.representanteTelefono.trim()
      ? enlaceWhatsApp(datos.representanteTelefono, mensajeParaRepresentante(actual(estado)))
      : null;

  return (
    <div className="admin-dashboard">
      <div className="admin-edit-header">
        <div>
          <Link to="/admin/constancias" className="admin-back-link">← Volver a constancias</Link>
          <h2>
            {esNueva ? 'Nueva constancia' : `${inicial.codigo} — ${tituloTipo(datos.tipo)}`}
          </h2>
          {!esNueva && (
            <p className="fechas-ayuda">
              Solicitada el {fechaLegible(inicial.creadoEn)}
              {inicial.representanteNombre && ` por ${inicial.representanteNombre}`} ·{' '}
              <span className={`estado-badge ${estado}`}>{ESTADOS_CONSTANCIA[estado]}</span>
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
            <input
              id="fechaEmision"
              type="date"
              value={fechaEmision}
              onChange={(e) => setFechaEmision(e.target.value || hoyIso())}
            />

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

            <label htmlFor="parrafoAdicional">Párrafo adicional (opcional)</label>
            <textarea
              id="parrafoAdicional"
              placeholder="Texto que se agrega antes del cierre. Deja una línea en blanco para separar párrafos."
              value={parrafoAdicional}
              onChange={(e) => setParrafoAdicional(e.target.value)}
            />

            <div className="revision-acciones">
              {!pdfVigente ? (
                <button type="button" className="btn btn-primary" onClick={aprobar} disabled={generando}>
                  {generando ? 'Generando PDF…' : estado === 'aprobada' ? 'Generar PDF' : 'Aprobar y generar PDF'}
                </button>
              ) : (
                <>
                  {entrega === 'representante' && compartir && (
                    <button type="button" className="btn btn-primary" onClick={compartirPdf}>
                      Compartir PDF
                    </button>
                  )}
                  {entrega === 'coordinacion' && (
                    <button type="button" className="btn btn-primary" onClick={abrirParaImprimir}>
                      Abrir para imprimir
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn ${entrega === 'representante' && !compartir ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => descargarArchivo(pdfVigente.blob, pdfVigente.nombre)}
                  >
                    Descargar PDF
                  </button>
                </>
              )}
              {whatsapp && (
                <a className="btn btn-secondary" href={whatsapp} target="_blank" rel="noreferrer">
                  Avisar al representante
                </a>
              )}
            </div>
            {pdfVigente && entrega === 'representante' && !compartir && (
              <p className="fechas-ayuda">
                Descarga el PDF y adjúntalo en el chat del representante (ábrelo con «Avisar al representante»).
              </p>
            )}
            <p className="fechas-ayuda">La constancia sale con la línea para firma y sello a mano.</p>

            <label htmlFor="motivoRechazo">Motivo de rechazo</label>
            <input
              id="motivoRechazo"
              type="text"
              placeholder="Ej: El estudiante no pertenece a esa agrupación"
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
            />
            <div className="revision-acciones">
              <button type="button" className="btn btn-danger" onClick={rechazar} disabled={generando}>
                Rechazar
              </button>
              <button type="button" className="btn btn-secondary" onClick={guardar} disabled={generando}>
                Guardar cambios
              </button>
              {!esNueva && (
                <button type="button" className="btn btn-secondary" onClick={eliminar} disabled={generando}>
                  Quitar del historial
                </button>
              )}
            </div>

            {inicial.notas && (
              <p className="nota-representante">
                <strong>Nota del representante:</strong> {inicial.notas}
              </p>
            )}
          </section>

          <CamposSolicitud form={form} modo="coordinacion" />
        </form>

        <aside className="revision-vista">
          <h3>Vista previa</h3>
          <HojaEscalada>
            <ConstanciaDocumento
              datos={{ ...datos, parrafoAdicional }}
              codigo={inicial.codigo}
              firmante={FIRMANTE}
              fechaEmision={fechaEmision}
            />
          </HojaEscalada>
        </aside>
      </div>
    </div>
  );
}
