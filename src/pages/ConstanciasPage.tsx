import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SolicitarConstancia } from '../features/constancias/components/SolicitarConstancia';
import { decodificarPlantilla, plantillaDelHash } from '../features/constancias/lib/enlaceSolicitud';
import {
  describirPlantilla,
  leerRecibidas,
  recordarRecibida,
  tituloPlantilla,
} from '../features/constancias/lib/plantillas';
import type { Plantilla } from '../features/constancias/types/constancia.types';

/**
 * Página para representantes: /constancias
 * - #p=… abre una plantilla de la coordinación (y se recuerda en este dispositivo).
 * - Sin enlace: muestra las plantillas recibidas antes, o el formulario libre.
 */
export function ConstanciasPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const codificada = plantillaDelHash(hash);
  // undefined = aún no elige; null = solicitud libre (sin plantilla).
  const [elegida, setElegida] = useState<Plantilla | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!codificada) return;
    let vigente = true;
    decodificarPlantilla(codificada)
      .then((p) => {
        recordarRecibida(p, codificada);
        if (vigente) setElegida(p);
      })
      .catch((err) => vigente && setError(err instanceof Error ? err.message : 'No se pudo abrir el enlace.'));
    return () => {
      vigente = false;
    };
  }, [codificada]);

  const recibidas = leerRecibidas();
  const volverALista = () => {
    setElegida(undefined);
    setError(null);
    if (codificada) navigate('/constancias', { replace: true });
  };

  let contenido;
  if (codificada && elegida === undefined && !error) {
    contenido = <p>Abriendo constancia…</p>;
  } else if (elegida !== undefined || recibidas.length === 0) {
    contenido = (
      <>
        {recibidas.length > 0 && (
          <button type="button" className="btn-link volver-plantillas" onClick={volverALista}>
            ← Elegir otra constancia
          </button>
        )}
        <SolicitarConstancia key={elegida?.codigo ?? 'libre'} plantilla={elegida ?? null} />
      </>
    );
  } else {
    contenido = (
      <div className="plantillas-publicas">
        <h2>¿Cuál constancia necesitas?</h2>
        <p className="fechas-ayuda">Constancias preparadas por la coordinación que abriste en este dispositivo.</p>
        <div className="plantillas-lista">
          {recibidas.map(({ plantilla }) => (
            <button
              key={plantilla.codigo}
              type="button"
              className="plantilla-card"
              onClick={() => setElegida(plantilla)}
            >
              <span className="tipo-card-titulo">{tituloPlantilla(plantilla)}</span>
              <span className="tipo-card-desc">
                {describirPlantilla(plantilla.datos)
                  .slice(1)
                  .map((l) => l.valor)
                  .join(' · ')}
              </span>
            </button>
          ))}
          <button type="button" className="plantilla-card plantilla-card-libre" onClick={() => setElegida(null)}>
            <span className="tipo-card-titulo">Otra constancia</span>
            <span className="tipo-card-desc">Llenar todos los datos (horario, concierto, ensayo…).</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Solicitar constancia</h1>
        <p>Horario, participación en agrupación, conciertos y ensayos</p>
      </header>

      {error && <div className="alert-error">{error}</div>}
      {contenido}
    </div>
  );
}
