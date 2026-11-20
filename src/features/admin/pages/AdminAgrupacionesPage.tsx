import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AccesoCoordinacion } from '../components/AccesoCoordinacion';
import { guardarAgrupacion, useCatalogoAgrupaciones, type AgrupacionCatalogo } from '../../../lib/agrupaciones';

/** /admin/agrupaciones: nombres de las agrupaciones (los usa todo el sitio). */
export function AdminAgrupacionesPage() {
  return <AccesoCoordinacion>{(clave) => <Agrupaciones clave={clave} />}</AccesoCoordinacion>;
}

function Agrupaciones({ clave }: { clave: string }) {
  const queryClient = useQueryClient();
  const { data: catalogo, isFetching } = useCatalogoAgrupaciones();
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const guardar = async (a: { id?: string; nombre: string; activa: boolean }) => {
    setError('');
    setAviso('');
    try {
      const g = await guardarAgrupacion(clave, a);
      await queryClient.invalidateQueries({ queryKey: ['agrupaciones'] });
      setAviso(a.id ? `Guardado: ${g.nombre}.` : `Agregada: ${g.nombre}.`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      return false;
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-edit-header">
        <div>
          <h2>Agrupaciones</h2>
          <p className="fechas-ayuda">
            Estos nombres salen en los reportes de ensayo, en el perfil de los profesores y en las constancias. Si una
            agrupación cambia de nombre, cámbialo aquí; los reportes ya guardados conservan el nombre que tenían.
          </p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {aviso && <p className="aviso-info">{aviso}</p>}

      <form
        className="constancia-form agrupacion-nueva"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nueva.trim()) return setError('Escribe el nombre de la agrupación nueva.');
          if (await guardar({ nombre: nueva.trim(), activa: true })) setNueva('');
        }}
      >
        <label htmlFor="agrupacion-nueva">Agregar agrupación</label>
        <div className="agrupacion-fila">
          <input
            id="agrupacion-nueva"
            type="text"
            placeholder="Ej: CORO JUVENIL"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Agregar
          </button>
        </div>
      </form>

      <h3 className="profesores-titulo">
        Agrupaciones ({catalogo.length}){isFetching ? ' · actualizando…' : ''}
      </h3>
      <ul className="agrupaciones-lista">
        {catalogo.map((a) => (
          <FilaAgrupacion key={a.id} agrupacion={a} onGuardar={guardar} />
        ))}
      </ul>
    </div>
  );
}

function FilaAgrupacion({
  agrupacion,
  onGuardar,
}: {
  agrupacion: AgrupacionCatalogo;
  onGuardar: (a: { id: string; nombre: string; activa: boolean }) => Promise<boolean>;
}) {
  const [nombre, setNombre] = useState(agrupacion.nombre);
  const [activa, setActiva] = useState(agrupacion.activa);
  const [guardando, setGuardando] = useState(false);
  const cambio = nombre.trim() !== agrupacion.nombre || activa !== agrupacion.activa;

  return (
    <li className={activa ? '' : 'inactiva'} data-id={agrupacion.id}>
      <div className="agrupacion-fila">
        <input
          type="text"
          aria-label={`Nombre de ${agrupacion.nombre}`}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <label className="check-linea">
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
          Activa
        </label>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!cambio || !nombre.trim() || guardando}
          onClick={async () => {
            setGuardando(true);
            await onGuardar({ id: agrupacion.id, nombre: nombre.trim(), activa });
            setGuardando(false);
          }}
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      <span className="fechas-ayuda">
        Código {agrupacion.id}
        {!activa && ' · Inactiva: no aparece en los formularios'}
      </span>
    </li>
  );
}
