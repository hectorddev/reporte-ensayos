import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import { ListaInformesPSB } from '../../psb/components/ListaInformesPSB';
import { descargarInformePSBCoordinacion, listarInformesPSB } from '../../psb/api/psb.api';
import { MODULOS_PSB } from '../../../lib/datosEstaticos';

/** /admin/psb: informes semanales del Programa Simón Bolívar de todas las escuelas. */
export function AdminPSBPage() {
  return <AccesoCoordinacion>{(clave) => <InformesPSB clave={clave} />}</AccesoCoordinacion>;
}

function InformesPSB({ clave }: { clave: string }) {
  const [escuela, setEscuela] = useState('');
  const informes = useQuery({ queryKey: ['admin-psb'], queryFn: () => listarInformesPSB(clave) });
  const visibles = (informes.data ?? []).filter((i) => !escuela || i.modulo === escuela);

  return (
    <div className="admin-dashboard">
      <div className="reportes-lista-header">
        <div>
          <h2>Programa Simón Bolívar</h2>
          <p className="fechas-ayuda">
            Informes semanales que envían los profesores. El Word y las fotos quedan en tu Drive, en la carpeta «Informes
            PSB».
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
        descargarWord={(id) => descargarInformePSBCoordinacion(clave, id)}
        conEnlacesDrive
      />
    </div>
  );
}
