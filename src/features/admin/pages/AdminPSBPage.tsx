import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import { ListaInformesPSB } from '../../psb/components/ListaInformesPSB';
import { WordSemana } from '../../psb/components/WordSemana';
import { listarInformesPSB } from '../../psb/api/psb.api';
import { MODULOS_PSB } from '../../../lib/datosEstaticos';
import type { InformePSB } from '../../psb/tipos';

/** /admin/psb: clases del Programa Simón Bolívar y Word semanal de cada escuela. */
export function AdminPSBPage() {
  return <AccesoCoordinacion>{(clave) => <InformesPSB clave={clave} />}</AccesoCoordinacion>;
}

function InformesPSB({ clave }: { clave: string }) {
  const [escuela, setEscuela] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const informes = useQuery({ queryKey: ['admin-psb'], queryFn: () => listarInformesPSB(clave) });
  const todos = informes.data ?? [];
  const visibles = todos.filter((i) => !escuela || i.modulo === escuela);

  /** Agrupaciones que tenía el Word de otra semana de esa escuela (informes anteriores). */
  const agrupacionesDe = (inf: InformePSB) =>
    todos
      .filter((i) => i.modulo === inf.modulo && i.agrupaciones)
      .sort((a, b) => b.semana.localeCompare(a.semana))[0]?.agrupaciones;

  return (
    <div className="admin-dashboard">
      <div className="reportes-lista-header">
        <div>
          <h2>Programa Simón Bolívar</h2>
          <p className="fechas-ayuda">
            Clases que reportan los formadores cada día. Aquí armas el Word de cada semana; las fotos quedan en tu Drive, en
            la carpeta «Informes PSB».
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void informes.refetch()}>
          Actualizar
        </button>
      </div>

      <div className="reportes-filtros">
        <select value={escuela} onChange={(e) => setEscuela(e.target.value)} aria-label="Filtrar por escuela">
          <option value="">Todas las escuelas</option>
          {MODULOS_PSB.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      <ListaInformesPSB
        informes={visibles}
        cargando={informes.isLoading}
        error={informes.error}
        acciones={(inf) => (
          <>
            {abierto !== inf.id && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAbierto(inf.id)}>
                Armar Word
              </button>
            )}
            {inf.carpeta?.url && (
              <a className="btn btn-secondary btn-sm" href={inf.carpeta.url} target="_blank" rel="noreferrer">
                Abrir carpeta en Drive
              </a>
            )}
          </>
        )}
        detalle={(inf) =>
          abierto === inf.id && (
            <WordSemana
              key={inf.id}
              clave={clave}
              informe={inf}
              agrupacionesAnteriores={agrupacionesDe(inf)}
              onCerrar={() => setAbierto(null)}
            />
          )
        }
      />
    </div>
  );
}
