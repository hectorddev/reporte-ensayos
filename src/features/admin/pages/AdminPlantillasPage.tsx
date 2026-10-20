import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLogin } from '../components/AdminLogin';
import { isAdminAuthenticated } from '../../../lib/adminAuth';
import { codificarPlantilla, enlacePlantilla } from '../../constancias/lib/enlaceSolicitud';
import {
  describirPlantilla,
  eliminarPlantilla,
  leerPlantillas,
  plantillaVigente,
  tituloPlantilla,
} from '../../constancias/lib/plantillas';
import { enlaceWhatsApp, mensajePlantilla } from '../../constancias/lib/utilidades';
import type { Plantilla } from '../../constancias/types/constancia.types';

/** Plantillas creadas en este dispositivo, con su enlace para compartir. */
export function AdminPlantillasPage() {
  const [autenticado, setAutenticado] = useState(isAdminAuthenticated());
  const [plantillas, setPlantillas] = useState<Plantilla[]>(() => leerPlantillas());
  const [enlaces, setEnlaces] = useState<Record<string, string>>({});
  const [copiado, setCopiado] = useState<string | null>(null);

  // Los enlaces se calculan antes: copiar/compartir deben ocurrir directo en el clic.
  useEffect(() => {
    let vigente = true;
    Promise.all(plantillas.map(async (p) => [p.codigo, enlacePlantilla(await codificarPlantilla(p))] as const)).then(
      (pares) => vigente && setEnlaces(Object.fromEntries(pares))
    );
    return () => {
      vigente = false;
    };
  }, [plantillas]);

  if (!autenticado) {
    return <AdminLogin onLogin={() => setAutenticado(true)} />;
  }

  const copiar = async (p: Plantilla) => {
    try {
      await navigator.clipboard.writeText(enlaces[p.codigo]);
      setCopiado(p.codigo);
    } catch {
      window.prompt('Copia el enlace:', enlaces[p.codigo]);
    }
  };

  const eliminar = (p: Plantilla) => {
    if (!window.confirm(`¿Eliminar la plantilla «${tituloPlantilla(p)}»? Los enlaces ya compartidos seguirán abriendo.`)) return;
    eliminarPlantilla(p.codigo);
    setPlantillas(leerPlantillas());
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-edit-header">
        <div>
          <Link to="/admin/constancias" className="admin-back-link">← Volver a constancias</Link>
          <h2>Plantillas de constancias</h2>
          <p className="fechas-ayuda">
            Fija tipo, fechas, días, horas y lugar una sola vez y comparte el enlace (por ejemplo, en el
            grupo de la agrupación). Cada persona solo llena sus datos personales.
          </p>
        </div>
        <Link to="/admin/constancias/plantillas/nueva" className="btn btn-primary">
          Nueva plantilla
        </Link>
      </div>

      {plantillas.length === 0 ? (
        <div className="reportes-vacio">
          <p>Aún no hay plantillas en este dispositivo.</p>
        </div>
      ) : (
        <div className="plantillas-lista">
          {plantillas.map((p) => {
            const enlace = enlaces[p.codigo];
            return (
              <article key={p.codigo} className={`plantilla-admin ${plantillaVigente(p) ? '' : 'vencida'}`}>
                <div>
                  <h3>{tituloPlantilla(p)}</h3>
                  <p className="fechas-ayuda">
                    {describirPlantilla(p.datos)
                      .slice(1)
                      .map((l) => l.valor)
                      .join(' · ')}
                    {!plantillaVigente(p) && ' · Vencida: ya no se muestra a los representantes'}
                  </p>
                </div>
                <div className="admin-acciones">
                  {enlace && (
                    <a
                      className="btn btn-primary btn-sm"
                      href={enlaceWhatsApp('', mensajePlantilla(p, enlace))}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Compartir por WhatsApp
                    </a>
                  )}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => copiar(p)} disabled={!enlace}>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
