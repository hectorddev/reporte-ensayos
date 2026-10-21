import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import { eliminarPlantilla, listarPlantillas } from '../../constancias/api/constancias.api';
import { resumenPlantilla, tituloPlantilla } from '../../constancias/lib/plantillas';
import { enlacePlantilla, enlaceWhatsApp, mensajePlantilla } from '../../constancias/lib/utilidades';
import type { Plantilla } from '../../constancias/types/constancia.types';

export function AdminPlantillasPage() {
  return <AccesoCoordinacion>{(clave) => <ListaPlantillas clave={clave} />}</AccesoCoordinacion>;
}

function ListaPlantillas({ clave }: { clave: string }) {
  const queryClient = useQueryClient();
  const [copiado, setCopiado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: plantillas = [], isLoading, error: errorCarga } = useQuery({
    queryKey: ['admin-plantillas'],
    queryFn: () => listarPlantillas(clave),
  });

  const copiar = async (p: Plantilla) => {
    const enlace = enlacePlantilla(p.codigo);
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(p.codigo);
    } catch {
      window.prompt('Copia el enlace:', enlace);
    }
  };

  const eliminar = async (p: Plantilla) => {
    if (!window.confirm(`¿Eliminar la plantilla «${tituloPlantilla(p)}»? Su enlace dejará de funcionar.`)) return;
    setError(null);
    try {
      await eliminarPlantilla(p.codigo, clave);
      await queryClient.invalidateQueries({ queryKey: ['admin-plantillas'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-edit-header">
        <div>
          <Link to="/admin/constancias" className="admin-back-link">← Volver a constancias</Link>
          <h2>Plantillas de constancias</h2>
          <p className="fechas-ayuda">
            Fija tipo, fechas, días, horas y lugar una sola vez. Las vigentes aparecen al entrar a
            /constancias, y puedes compartir su enlace corto en el grupo de la agrupación.
          </p>
        </div>
        <Link to="/admin/constancias/plantillas/nueva" className="btn btn-primary">
          Nueva plantilla
        </Link>
      </div>

      {(error || errorCarga) && (
        <div className="alert-error">
          {error ?? (errorCarga instanceof Error ? errorCarga.message : 'No se pudieron cargar las plantillas.')}
        </div>
      )}
      {isLoading && <p>Cargando plantillas…</p>}

      {!isLoading && plantillas.length === 0 && !errorCarga && (
        <div className="reportes-vacio">
          <p>Aún no hay plantillas.</p>
        </div>
      )}

      <div className="plantillas-lista">
        {plantillas.map((p) => (
          <article key={p.codigo} className="plantilla-admin">
            <div>
              <h3>{tituloPlantilla(p)}</h3>
              <p className="fechas-ayuda">{resumenPlantilla(p)}</p>
              <p className="fechas-ayuda enlace-corto">{enlacePlantilla(p.codigo)}</p>
            </div>
            <div className="admin-acciones">
              <a
                className="btn btn-primary btn-sm"
                href={enlaceWhatsApp('', mensajePlantilla(p))}
                target="_blank"
                rel="noreferrer"
              >
                Compartir por WhatsApp
              </a>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => copiar(p)}>
                {copiado === p.codigo ? 'Copiado ✓' : 'Copiar enlace'}
              </button>
              <Link to={`/admin/constancias/plantillas/${p.codigo}`} className="btn btn-secondary btn-sm">
                Editar
              </Link>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => eliminar(p)}>
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
