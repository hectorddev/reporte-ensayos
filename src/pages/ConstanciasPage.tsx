import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SolicitarConstancia } from '../features/constancias/components/SolicitarConstancia';
import { leerPlantilla, listarPlantillasActivas } from '../features/constancias/api/constancias.api';
import { resumenPlantilla, tituloPlantilla } from '../features/constancias/lib/plantillas';
import type { Plantilla } from '../features/constancias/types/constancia.types';

/**
 * Página para representantes.
 * - /constancias: plantillas vigentes de la coordinación + «Otra constancia».
 * - /p/:codigo: abre directo una plantilla (enlace corto compartido por WhatsApp).
 */
export function ConstanciasPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  // undefined = aún no elige; null = solicitud libre (sin plantilla).
  const [elegida, setElegida] = useState<Plantilla | null | undefined>(undefined);

  const directa = useQuery({
    queryKey: ['plantilla', codigo],
    queryFn: () => leerPlantilla(codigo!),
    enabled: !!codigo,
    retry: 1,
  });
  const activas = useQuery({
    queryKey: ['plantillas-activas'],
    queryFn: listarPlantillasActivas,
    enabled: !codigo,
    retry: 1,
  });

  const volverALista = () => {
    setElegida(undefined);
    if (codigo) navigate('/constancias');
  };

  let contenido;
  if (codigo && elegida === undefined) {
    if (directa.isLoading) contenido = <p>Abriendo constancia…</p>;
    else if (directa.data) contenido = <Formulario plantilla={directa.data} onVolver={volverALista} />;
    else {
      contenido = (
        <>
          <div className="alert-error">
            {directa.error instanceof Error ? directa.error.message : 'No se pudo abrir la constancia.'}
          </div>
          <Formulario plantilla={null} onVolver={volverALista} />
        </>
      );
    }
  } else if (elegida !== undefined) {
    contenido = <Formulario plantilla={elegida} onVolver={volverALista} />;
  } else if (activas.isLoading) {
    contenido = <p>Cargando constancias…</p>;
  } else if (!activas.data?.length) {
    // Sin plantillas (o sin conexión): directo al formulario libre.
    contenido = (
      <>
        {activas.error && (
          <div className="alert-error">
            {activas.error instanceof Error ? activas.error.message : 'No se pudieron cargar las constancias.'}
          </div>
        )}
        <SolicitarConstancia key="libre" />
      </>
    );
  } else {
    contenido = (
      <div className="plantillas-publicas">
        <h2>¿Cuál constancia necesitas?</h2>
        <p className="fechas-ayuda">Elige una preparada por la coordinación: solo tendrás que poner tus datos.</p>
        <div className="plantillas-lista">
          {activas.data.map((p) => (
            <button key={p.codigo} type="button" className="plantilla-card" onClick={() => setElegida(p)}>
              <span className="tipo-card-titulo">{tituloPlantilla(p)}</span>
              <span className="tipo-card-desc">{resumenPlantilla(p)}</span>
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
      {contenido}
    </div>
  );
}

function Formulario({ plantilla, onVolver }: { plantilla: Plantilla | null; onVolver: () => void }) {
  return (
    <>
      <button type="button" className="btn-link volver-plantillas" onClick={onVolver}>
        ← Elegir otra constancia
      </button>
      <SolicitarConstancia key={plantilla?.codigo ?? 'libre'} plantilla={plantilla} />
    </>
  );
}
