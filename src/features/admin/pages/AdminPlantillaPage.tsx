import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AdminLogin } from '../components/AdminLogin';
import { isAdminAuthenticated } from '../../../lib/adminAuth';
import {
  CampoAgrupacion,
  SeccionDetalle,
  SeccionTipo,
} from '../../constancias/components/CamposSolicitud';
import { ResumenPlantilla } from '../../constancias/components/ResumenPlantilla';
import { codificarPlantilla, enlacePlantilla, generarCodigo } from '../../constancias/lib/enlaceSolicitud';
import { buscarPlantilla, guardarPlantilla, tituloPlantilla } from '../../constancias/lib/plantillas';
import { enlaceWhatsApp, mensajePlantilla } from '../../constancias/lib/utilidades';
import {
  SOLICITUD_VACIA,
  datosDePlantilla,
  type DatosSolicitud,
  type Plantilla,
} from '../../constancias/types/constancia.types';

/** Crear o editar una plantilla: /admin/constancias/plantillas/nueva | /:codigo */
export function AdminPlantillaPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [autenticado, setAutenticado] = useState(isAdminAuthenticated());

  if (!autenticado) {
    return <AdminLogin onLogin={() => setAutenticado(true)} />;
  }

  const existente = codigo ? buscarPlantilla(codigo) : undefined;
  if (codigo && !existente) {
    return (
      <div className="admin-dashboard">
        <div className="alert-error">Esta plantilla no está en este dispositivo.</div>
        <Link to="/admin/constancias/plantillas" className="btn btn-secondary">Volver a plantillas</Link>
      </div>
    );
  }
  return <EditorPlantilla key={codigo ?? 'nueva'} inicial={existente} />;
}

function EditorPlantilla({ inicial }: { inicial?: Plantilla }) {
  const form = useForm<DatosSolicitud>({
    defaultValues: { ...SOLICITUD_VACIA, ...(inicial?.datos ?? {}) },
  });
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [guardada, setGuardada] = useState<{ plantilla: Plantilla; enlace: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const borrador = { titulo, datos: datosDePlantilla(form.watch()) };

  const guardar = form.handleSubmit(async (valores) => {
    setError(null);
    setCopiado(false);
    try {
      const plantilla: Plantilla = {
        codigo: inicial?.codigo ?? guardada?.plantilla.codigo ?? generarCodigo('PL'),
        titulo: titulo.trim(),
        creadoEn: inicial?.creadoEn ?? new Date().toISOString(),
        datos: datosDePlantilla(valores),
      };
      guardarPlantilla(plantilla);
      setGuardada({ plantilla, enlace: enlacePlantilla(await codificarPlantilla(plantilla)) });
    } catch {
      setError('No se pudo generar el enlace. Intenta de nuevo.');
    }
  });

  const copiar = async () => {
    if (!guardada) return;
    try {
      await navigator.clipboard.writeText(guardada.enlace);
      setCopiado(true);
    } catch {
      window.prompt('Copia el enlace:', guardada.enlace);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-edit-header">
        <div>
          <Link to="/admin/constancias/plantillas" className="admin-back-link">← Volver a plantillas</Link>
          <h2>{inicial ? 'Editar plantilla' : 'Nueva plantilla'}</h2>
          {inicial && (
            <p className="fechas-ayuda">
              Si cambias algo, comparte el enlace nuevo: los enlaces viejos conservan los datos anteriores.
            </p>
          )}
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {guardada && (
        <section className="enlace-plantilla">
          <h3>¡Plantilla lista! Comparte este enlace</h3>
          <input type="text" readOnly value={guardada.enlace} onFocus={(e) => e.target.select()} aria-label="Enlace" />
          <div className="admin-acciones">
            <a
              className="btn btn-primary"
              href={enlaceWhatsApp('', mensajePlantilla(guardada.plantilla, guardada.enlace))}
              target="_blank"
              rel="noreferrer"
            >
              Compartir por WhatsApp
            </a>
            <button type="button" className="btn btn-secondary" onClick={copiar}>
              {copiado ? 'Copiado ✓' : 'Copiar enlace'}
            </button>
            <a className="btn btn-secondary" href={guardada.enlace} target="_blank" rel="noreferrer">
              Probar
            </a>
          </div>
        </section>
      )}

      <div className="revision-grid">
        <form className="constancia-form" onSubmit={guardar} noValidate>
          <section>
            <h3>Nombre de la plantilla</h3>
            <label htmlFor="tituloPlantilla">Título que verán los representantes</label>
            <input
              id="tituloPlantilla"
              type="text"
              maxLength={120}
              placeholder={tituloPlantilla({ titulo: '', datos: borrador.datos }) || 'Ej: Concierto de Navidad 2026'}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            <p className="fechas-ayuda">Opcional: si lo dejas vacío se usa el tipo y el nombre del evento.</p>
          </section>

          <SeccionTipo form={form} titulo="Tipo de constancia" />

          <section>
            <h3>Agrupación</h3>
            <div className="campos-grid">
              <CampoAgrupacion form={form} modo="coordinacion" opcional />
            </div>
          </section>

          <SeccionDetalle form={form} uso="plantilla" />

          <button type="submit" className="btn btn-primary btn-bloque">
            {guardada || inicial ? 'Guardar y actualizar enlace' : 'Guardar y obtener enlace'}
          </button>
        </form>

        <aside className="revision-vista">
          <h3>Así lo verá quien solicita</h3>
          <ResumenPlantilla plantilla={borrador} />
          <p className="fechas-ayuda">Debajo de este resumen, cada persona llena sus datos personales.</p>
        </aside>
      </div>
    </div>
  );
}
