import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CabeceraSitio } from '../components/CabeceraSitio';
import { ReporteMensualForm } from '../features/reporte-mensual/components/ReporteMensualForm';
import { ReportesLista } from '../features/reporte-mensual/components/ReportesLista';
import { useReportesMensuales } from '../features/reporte-mensual/hooks/useReportesMensuales';
import { entrarProfesor } from '../features/profesores/api/profesores.api';
import { MODULOS_PSB, PROGRAMA_PSB, nombreEnCatalogo } from '../lib/datosEstaticos';
import { useCatalogoAgrupaciones, type AgrupacionCatalogo } from '../lib/agrupaciones';
import { resumenHorario } from '../features/profesores/lib/horario';
import { PanelPSB } from '../features/psb/components/PanelPSB';
import { ErrorServicio } from '../lib/nube';
import {
  actualizarPerfilProfesor,
  cerrarSesionProfesor,
  getSesionProfesor,
  normalizarCedula,
  setSesionProfesor,
  type SesionProfesor,
} from '../lib/profesorAuth';
import type { Agrupacion } from '../features/reporte-mensual/types/reporteMensual.types';

type Vista = 'nuevo' | 'lista';
type Area = 'ensayo' | 'psb';

/** Agrupaciones del profesor en el orden del catálogo (las desconocidas, con su código). */
function agrupacionesDe(sesion: SesionProfesor, catalogo: AgrupacionCatalogo[]): Agrupacion[] {
  const conocidas = catalogo
    .filter((a) => sesion.agrupaciones.includes(a.id))
    .map((a) => ({ id: a.id, codigo: a.codigo, nombre: a.nombre }));
  const otras = sesion.agrupaciones
    .filter((id) => !catalogo.some((a) => a.id === id))
    .map((id) => ({ id, codigo: id, nombre: id }));
  return [...conocidas, ...otras];
}

/** Profesores: entran con su cédula y registran los reportes de sus agrupaciones. */
export function ProfesoresPage() {
  const [sesion, setSesion] = useState(getSesionProfesor);
  const [aviso, setAviso] = useState('');
  const queryClient = useQueryClient();

  // Al abrir: confirma la cédula y trae nombre y agrupaciones al día (la
  // coordinación pudo cambiarlos). Sin conexión se sigue con lo guardado.
  const cedula = sesion?.cedula;
  useEffect(() => {
    if (!cedula) return;
    let vigente = true;
    entrarProfesor(cedula)
      .then((perfil) => {
        if (!vigente) return;
        actualizarPerfilProfesor(perfil);
        setSesion(getSesionProfesor());
      })
      .catch((err) => {
        if (vigente && err instanceof ErrorServicio && err.codigo === 'PROFESOR_NO_REGISTRADO') {
          cerrarSesionProfesor();
          setSesion(null);
          setAviso('Tu cédula ya no está registrada. Si crees que es un error, habla con la coordinación.');
        }
      });
    return () => {
      vigente = false;
    };
  }, [cedula]);

  const cambiarSesion = (nueva: SesionProfesor | null) => {
    // Lo de otro profesor en este equipo no debe verse.
    queryClient.removeQueries({ queryKey: ['reportes-mensuales'] });
    setSesion(nueva);
  };

  return (
    <>
      <CabeceraSitio />
      <div className="app">
        {sesion ? (
          <PanelProfesor
            sesion={sesion}
            onSalir={() => {
              cerrarSesionProfesor();
              setAviso('');
              cambiarSesion(null);
            }}
          />
        ) : (
          <EntradaProfesor aviso={aviso} onEntrar={cambiarSesion} />
        )}
      </div>
    </>
  );
}

function EntradaProfesor({ aviso, onEntrar }: { aviso: string; onEntrar: (s: SesionProfesor | null) => void }) {
  const [cedula, setCedula] = useState('');
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpia = normalizarCedula(cedula);
    if (limpia.length < 5) {
      setError('Escribe tu número de cédula completo.');
      return;
    }
    setError('');
    setCargando(true);
    try {
      const perfil = await entrarProfesor(limpia);
      setSesionProfesor({ cedula: limpia, ...perfil }, recordar);
      onEntrar(getSesionProfesor());
    } catch (err) {
      if (err instanceof ErrorServicio && err.codigo === 'PROFESOR_NO_REGISTRADO') {
        setError('No encontramos esa cédula. Revisa el número o pide a la coordinación que te registre.');
      } else if (err instanceof ErrorServicio) {
        setError(err.message);
      } else {
        setError('No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="admin-login">
      <form onSubmit={entrar} className="admin-login-card" noValidate>
        <p className="pagina-etiqueta">Profesores</p>
        <h2>Acceso de profesores</h2>
        <p className="fechas-ayuda">
          Entra con tu número de cédula para registrar los reportes de ensayo de tus agrupaciones o los informes del
          Programa Simón Bolívar.
        </p>
        {aviso && <p className="error">{aviso}</p>}

        <label htmlFor="cedula-profesor">Número de cédula</label>
        <input
          id="cedula-profesor"
          type="text"
          inputMode="numeric"
          autoComplete="username"
          placeholder="Ej: 12345678"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
        />

        <label className="check-linea">
          <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
          Mantener la sesión abierta en este equipo
        </label>
        <p className="fechas-ayuda">No lo marques en una computadora que usen otras personas.</p>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={cargando || !cedula.trim()}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="fechas-ayuda">
          ¿Todavía no puedes entrar? La coordinación te registra con tu cédula, tus programas y lo que llevas.
        </p>
      </form>
    </div>
  );
}

function PanelProfesor({ sesion, onSalir }: { sesion: SesionProfesor; onSalir: () => void }) {
  const { data: catalogo } = useCatalogoAgrupaciones();
  const agrupaciones = agrupacionesDe(sesion, catalogo);
  const tieneEnsayo = agrupaciones.length > 0;
  const tienePSB = sesion.programas.includes(PROGRAMA_PSB) && sesion.modulos.length > 0;
  const [area, setArea] = useState<Area>(tieneEnsayo ? 'ensayo' : 'psb');
  const areaVisible: Area = area === 'psb' && tienePSB ? 'psb' : tieneEnsayo ? 'ensayo' : 'psb';

  let titulo = 'Reportes de ensayo';
  if (tieneEnsayo && tienePSB) titulo = 'Mis reportes';
  else if (tienePSB) titulo = 'Informes Simón Bolívar';

  return (
    <>
      <header className="app-header">
        <p className="pagina-etiqueta">Profesores</p>
        <h1>{titulo}</h1>
        <div className="profesor-sesion">
          <div>
            <p>
              Hola, <strong>{sesion.nombre || 'profesor'}</strong>.
            </p>
            {tieneEnsayo && (
              <p className="fechas-ayuda">
                {agrupaciones.length === 1 ? 'Agrupación: ' : 'Agrupaciones: '}
                {agrupaciones.map((a) => a.nombre).join(' · ')}
              </p>
            )}
            {tienePSB && (
              <p className="fechas-ayuda">
                {sesion.modulos.length === 1 ? 'Escuela (Simón Bolívar): ' : 'Escuelas (Simón Bolívar): '}
                {sesion.modulos.map((id) => nombreEnCatalogo(MODULOS_PSB, id)).join(' · ')}
              </p>
            )}
            {sesion.horario && sesion.horario.length > 0 && (
              <p className="fechas-ayuda">Tu horario: {resumenHorario(sesion.horario)}</p>
            )}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onSalir}>
            Cerrar sesión
          </button>
        </div>

        {tieneEnsayo && tienePSB && (
          <fieldset className="opciones-botones area-profesor">
            <legend>¿Qué vas a hacer?</legend>
            {(
              [
                ['ensayo', 'Reportes de ensayo'],
                ['psb', 'Informes Simón Bolívar'],
              ] as const
            ).map(([valor, texto]) => (
              <label key={valor} className={areaVisible === valor ? 'activo' : ''}>
                <input type="radio" name="area" checked={areaVisible === valor} onChange={() => setArea(valor)} />
                {texto}
              </label>
            ))}
          </fieldset>
        )}
      </header>

      {!tieneEnsayo && !tienePSB ? (
        <p className="aviso-info">
          La coordinación todavía no te asignó agrupaciones ni escuelas. Pídeles que lo hagan y vuelve a entrar.
        </p>
      ) : areaVisible === 'ensayo' ? (
        <AreaEnsayo agrupaciones={agrupaciones} />
      ) : (
        <PanelPSB sesion={sesion} />
      )}
    </>
  );
}

function AreaEnsayo({ agrupaciones }: { agrupaciones: Agrupacion[] }) {
  const [vista, setVista] = useState<Vista>('nuevo');
  const queryClient = useQueryClient();
  const { data: reportes } = useReportesMensuales();

  const irALista = () => {
    queryClient.invalidateQueries({ queryKey: ['reportes-mensuales'] });
    setVista('lista');
  };

  return (
    <>
      <nav className="app-nav" aria-label="Reportes de ensayo">
        <button
          type="button"
          className={`nav-btn ${vista === 'nuevo' ? 'activo' : ''}`}
          aria-pressed={vista === 'nuevo'}
          onClick={() => setVista('nuevo')}
        >
          Nuevo reporte
        </button>
        <button
          type="button"
          className={`nav-btn ${vista === 'lista' ? 'activo' : ''}`}
          aria-pressed={vista === 'lista'}
          onClick={irALista}
        >
          Mis reportes
        </button>
      </nav>
      {vista === 'nuevo' ? (
        <ReporteMensualForm agrupaciones={agrupaciones} reportes={reportes} onGuardadoExitoso={irALista} />
      ) : (
        <ReportesLista agrupaciones={agrupaciones} />
      )}
    </>
  );
}
