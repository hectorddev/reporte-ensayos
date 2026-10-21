import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
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

function RevisionConstancia({ inicial, clave }: RevisionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<DatosSolicitud>({ defaultValues: datosDeSolicitud({ ...inicial }) });
  const [codigo, setCodigo] = useState(inicial.codigo);
  const [estado, setEstado] = useState<EstadoConstancia>(inicial.estado);
  const [fechaEmision, setFechaEmision] = useState(inicial.fechaEmision || hoyIso());
  const [parrafoAdicional, setParrafoAdicional] = useState(inicial.parrafoAdicional);
  const [entrega, setEntrega] = useState<EntregaConstancia>(inicial.entrega);
  const [motivoRechazo, setMotivoRechazo] = useState(inicial.motivoRechazo);
  const [ocupado, setOcupado] = useState(false);
  const [pdf, setPdf] = useState<{ blob: Blob; nombre: string; huella: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const compartir = puedeCompartirArchivos();
  const esNueva = !codigo;

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
  const aprobar = form.handleSubmit(() =>
    conEspera(async () => {
      const c = await persistir('aprobada');
      const blob = await generarPdfConstancia({ datos: c, codigo: c.codigo, firmante: FIRMANTE, fechaEmision });
      setPdf({ blob, nombre: nombreArchivoPdf(c), huella });
      setAviso('Constancia aprobada. Elige cómo entregarla.');
    })
  );

  const guardar = form.handleSubmit(() =>
    conEspera(async () => {
      await persistir(estado);
      setAviso('Cambios guardados.');
    })
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

  const whatsapp =
    estado !== 'pendiente' && codigo && datos.representanteTelefono.trim()
      ? enlaceWhatsApp(datos.representanteTelefono, mensajeParaRepresentante(actual(estado)))
      : null;

  return (
    <div className="admin-dashboard">
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
                <button type="button" className="btn btn-primary" onClick={aprobar} disabled={ocupado}>
                  {ocupado ? 'Guardando…' : estado === 'aprobada' ? 'Generar PDF' : 'Aprobar y generar PDF'}
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
              <button type="button" className="btn btn-danger" onClick={rechazar} disabled={ocupado}>
                Rechazar
              </button>
              <button type="button" className="btn btn-secondary" onClick={guardar} disabled={ocupado}>
                Guardar cambios
              </button>
              {!esNueva && (
                <button type="button" className="btn btn-secondary" onClick={eliminar} disabled={ocupado}>
                  Eliminar
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
