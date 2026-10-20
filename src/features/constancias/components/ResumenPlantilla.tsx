import { describirPlantilla, tituloPlantilla } from '../lib/plantillas';
import type { Plantilla } from '../types/constancia.types';

interface Props {
  plantilla: Pick<Plantilla, 'titulo' | 'datos'>;
  /** Texto bajo el título; por defecto explica que lo definió la coordinación. */
  nota?: string;
}

/** Datos fijos de una plantilla, tal como los ve quien solicita. */
export function ResumenPlantilla({ plantilla, nota }: Props) {
  return (
    <section className="plantilla-resumen">
      <h3>{tituloPlantilla(plantilla)}</h3>
      <p className="fechas-ayuda">
        {nota ?? 'Estos datos los definió la coordinación. Solo completa tu información.'}
      </p>
      <dl>
        {describirPlantilla(plantilla.datos).map((linea, i) => (
          <div key={i}>
            <dt>{linea.etiqueta}</dt>
            <dd>{linea.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
