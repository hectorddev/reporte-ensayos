import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import {
  CampoAgrupacion,
  SeccionDetalle,
  SeccionTipo,
} from '../../constancias/components/CamposSolicitud';
import { ResumenPlantilla } from '../../constancias/components/ResumenPlantilla';
import { guardarPlantilla, listarPlantillas } from '../../constancias/api/constancias.api';
import { tituloPlantilla } from '../../constancias/lib/plantillas';
import { enlacePlantilla, enlaceWhatsApp, mensajePlantilla } from '../../constancias/lib/utilidades';
import {
  SOLICITUD_VACIA,
  datosDePlantilla,
  type DatosSolicitud,
  type Plantilla,
} from '../../constancias/types/constancia.types';

/** Crear o editar una plantilla: /admin/constancias/plantillas/nueva | /:codigo */
export function AdminPlantillaPage() {
  return <AccesoCoordinacion>{(clave) => <CargadorPlantilla clave={clave} />}</AccesoCoordinacion>;
}

function CargadorPlantilla({ clave }: { clave: string }) {
  const { codigo } = useParams<{ codigo: string }>();
  const lista = useQuery({
    queryKey: ['admin-plantillas'],
    queryFn: () => listarPlantillas(clave),
    enabled: !!codigo,
  });

  if (!codigo) return <EditorPlantilla clave={clave} />;
  if (lista.isLoading) return <p>Cargando plantilla…</p>;

  const existente = lista.data?.find((p) => p.codigo === codigo.toUpperCase());
  if (!existente) {
    return (
      <div className="admin-dashboard">
        <div className="alert-error">
          {lista.error instanceof Error ? lista.error.message : `No existe la plantilla ${codigo}.`}
        </div>
        <Link to="/admin/constancias/plantillas" className="btn btn-secondary">Volver a plantillas</Link>
      </div>
    );
  }
  return <EditorPlantilla key={existente.codigo} clave={clave} inicial={existente} />;
}

function EditorPlantilla({ clave, inicial }: { clave: string; inicial?: Plantilla }) {
  const queryClient = useQueryClient();
  const form = useForm<DatosSolicitud>({
    defaultValues: { ...SOLICITUD_VACIA, ...(inicial?.datos ?? {}) },
  });
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [guardada, setGuardada] = useState<Plantilla | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const borrador = { titulo, datos: datosDePlantilla(form.watch()) };

  const guardar = form.handleSubmit(async (valores) => {
    setError(null);
    setCopiado(false);
    try {
      const plantilla = await guardarPlantilla(
        {
          codigo: guardada?.codigo ?? inicial?.codigo,
          creadoEn: inicial?.creadoEn,
          titulo: titulo.trim(),
          datos: datosDePlantilla(valores),
        },
        clave
      );
      setGuardada(plantilla);
      await queryClient.invalidateQueries({ queryKey: ['admin-plantillas'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la plantilla.');
    }
  });

  const copiar = async () => {
    if (!guardada) return;
    const enlace = enlacePlantilla(guardada.codigo);
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch {
      window.prompt('Copia el enlace:', enlace);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-edit-header">
        <div>
          <Link to="/admin/constancias/plantillas" className="admin-back-link">← Volver a plantillas</Link>
          <h2>{inicial ? 'Editar plantilla' : 'Nueva plantilla'}</h2>
          {inicial && (
            <p className="fechas-ayuda">El enlace no cambia: quien lo abra verá los datos actualizados.</p>
          )}
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {guardada && (
        <section className="enlace-plantilla">
          <h3>¡Plantilla guardada! Ya aparece en /constancias</h3>
          <input
            type="text"
            readOnly
            value={enlacePlantilla(guardada.codigo)}
            onFocus={(e) => e.target.select()}
            aria-label="Enlace"
          />
          <div className="admin-acciones">
            <a
              className="btn btn-primary"
              href={enlaceWhatsApp('', mensajePlantilla(guardada))}
              target="_blank"
              rel="noreferrer"
            >
              Compartir por WhatsApp
            </a>
            <button type="button" className="btn btn-secondary" onClick={copiar}>
              {copiado ? 'Copiado ✓' : 'Copiar enlace'}
            </button>
            <a className="btn btn-secondary" href={enlacePlantilla(guardada.codigo)} target="_blank" rel="noreferrer">
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

          <button type="submit" className="btn btn-primary btn-bloque" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Guardando…' : 'Guardar plantilla'}
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
