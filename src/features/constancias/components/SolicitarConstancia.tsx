import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CamposSolicitud } from './CamposSolicitud';
import { WHATSAPP_COORDINACION } from '../config';
import { crearSolicitud } from '../api/constancias.api';
import { enlaceWhatsApp, mensajeSolicitud } from '../lib/utilidades';
import {
  SOLICITUD_VACIA,
  aplicarPlantilla,
  limpiarSolicitud,
  type DatosSolicitud,
  type Plantilla,
} from '../types/constancia.types';

interface Enviada {
  codigo: string;
  whatsapp: string;
}

interface Props {
  /** Con plantilla, la coordinación ya fijó tipo, fechas, horas y lugar. */
  plantilla?: Plantilla | null;
}

/**
 * El representante llena los datos y la solicitud se guarda en el servicio de
 * constancias. Después avisa a la coordinación con un mensaje corto por WhatsApp.
 */
export function SolicitarConstancia({ plantilla = null }: Props) {
  const iniciales = plantilla ? aplicarPlantilla(SOLICITUD_VACIA, plantilla) : SOLICITUD_VACIA;
  const form = useForm<DatosSolicitud>({ defaultValues: iniciales });
  const [enviada, setEnviada] = useState<Enviada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avisado, setAvisado] = useState(false);

  const onSubmit = async (datos: DatosSolicitud) => {
    setError(null);
    try {
      // La plantilla manda sobre lo fijo, aunque el formulario lo haya cambiado.
      const solicitud = limpiarSolicitud(plantilla ? aplicarPlantilla(datos, plantilla) : datos);
      const { codigo } = await crearSolicitud({ ...solicitud, plantilla: plantilla?.codigo });
      const mensaje = mensajeSolicitud({ ...solicitud, codigo });
      setEnviada({ codigo, whatsapp: enlaceWhatsApp(WHATSAPP_COORDINACION, mensaje) });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud. Intenta de nuevo.');
    }
  };

  // Conserva los datos del representante para pedir otra (p. ej. un hermano).
  const otraSolicitud = () => {
    const { representanteNombre, representanteCedula, representanteTelefono } = form.getValues();
    form.reset({ ...iniciales, representanteNombre, representanteCedula, representanteTelefono });
    setEnviada(null);
    setAvisado(false);
  };

  if (enviada) {
    return (
      <div className="constancia-enviada">
        <h2>¡Solicitud recibida!</h2>
        <p>
          Código: <strong>{enviada.codigo}</strong>. Avisa a la coordinación por WhatsApp: el mensaje ya
          está escrito, solo pulsa <strong>enviar</strong>.
        </p>
        <a
          className="btn btn-primary btn-whatsapp"
          href={enviada.whatsapp}
          target="_blank"
          rel="noreferrer"
          onClick={() => setAvisado(true)}
        >
          Avisar por WhatsApp
        </a>
        {avisado && (
          <p className="fechas-ayuda">
            Si en WhatsApp el mensaje aparece repetido, borra el sobrante antes de enviar.
          </p>
        )}
        <p className="fechas-ayuda">La coordinación te responderá al número que indicaste.</p>
        <div className="constancia-enviada-acciones">
          <button type="button" className="btn btn-secondary btn-sm" onClick={otraSolicitud}>
            Hacer otra solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="constancia-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <CamposSolicitud form={form} modo="representante" plantilla={plantilla} />

      {error && <div className="alert-error">{error}</div>}

      <button type="submit" className="btn btn-primary btn-bloque" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </form>
  );
}
