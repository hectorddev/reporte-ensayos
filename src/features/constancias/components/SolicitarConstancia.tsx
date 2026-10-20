import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CamposSolicitud } from './CamposSolicitud';
import { WHATSAPP_COORDINACION } from '../config';
import { codificarSolicitud, enlaceRevision, generarCodigo } from '../lib/enlaceSolicitud';
import { enlaceWhatsApp, mensajeSolicitud } from '../lib/utilidades';
import {
  SOLICITUD_VACIA,
  limpiarSegunTipo,
  type DatosSolicitud,
} from '../types/constancia.types';

interface Preparada {
  codigo: string;
  whatsapp: string;
  mensaje: string;
}

/**
 * El representante llena los datos; la app arma un mensaje con un enlace que
 * contiene la solicitud y lo envía por WhatsApp a la coordinación.
 */
export function SolicitarConstancia() {
  const form = useForm<DatosSolicitud>({ defaultValues: SOLICITUD_VACIA });
  const [preparada, setPreparada] = useState<Preparada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const onSubmit = async (datos: DatosSolicitud) => {
    setError(null);
    try {
      const solicitud = { ...limpiarSegunTipo(datos), codigo: generarCodigo(), creadoEn: new Date().toISOString() };
      const mensaje = mensajeSolicitud(solicitud, enlaceRevision(await codificarSolicitud(solicitud)));
      setPreparada({ codigo: solicitud.codigo, mensaje, whatsapp: enlaceWhatsApp(WHATSAPP_COORDINACION, mensaje) });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('No se pudo preparar la solicitud. Intenta de nuevo.');
    }
  };

  // Conserva los datos del representante para pedir otra (p. ej. un hermano).
  const otraSolicitud = () => {
    const { representanteNombre, representanteCedula, representanteTelefono } = form.getValues();
    form.reset({ ...SOLICITUD_VACIA, representanteNombre, representanteCedula, representanteTelefono });
    setPreparada(null);
    setCopiado(false);
  };

  const copiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(preparada!.mensaje);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  if (preparada) {
    return (
      <div className="constancia-enviada">
        <h2>Último paso: envíala por WhatsApp</h2>
        <p>
          Se abrirá WhatsApp con el mensaje listo para la coordinación. Solo pulsa <strong>enviar</strong>.
        </p>
        <a className="btn btn-primary btn-whatsapp" href={preparada.whatsapp} target="_blank" rel="noreferrer">
          Enviar por WhatsApp
        </a>
        <p className="fechas-ayuda">
          Código de tu solicitud: <strong>{preparada.codigo}</strong>. La coordinación te responderá
          por WhatsApp al número que indicaste.
        </p>
        <div className="constancia-enviada-acciones">
          <button type="button" className="btn btn-secondary btn-sm" onClick={copiarMensaje}>
            {copiado ? 'Mensaje copiado ✓' : '¿No abre? Copiar mensaje'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPreparada(null)}>
            Corregir datos
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={otraSolicitud}>
            Hacer otra solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="constancia-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <CamposSolicitud form={form} modo="representante" />

      {error && <div className="alert-error">{error}</div>}

      <button type="submit" className="btn btn-primary btn-bloque" disabled={form.formState.isSubmitting}>
        Continuar
      </button>
    </form>
  );
}
