import { useEffect, useState, type ReactNode } from 'react';
import { AdminLogin } from './AdminLogin';
import { CampoClave } from './CampoClave';
import {
  getAdminPassword,
  getClaveCoordinacion,
  isAdminAuthenticated,
  setClaveCoordinacion,
} from '../../../lib/adminAuth';
import { ClaveInvalidaError, verificarClave } from '../../constancias/api/constancias.api';

type Estado = 'verificando' | 'listo' | 'pedir' | 'error';

/**
 * Puerta de las páginas de constancias del panel: login del panel y, además,
 * la clave de coordinación que valida el servicio (protege los datos guardados).
 * Primero prueba la clave del panel, así sin configuración extra no se pide dos veces.
 */
export function AccesoCoordinacion({ children }: { children: (clave: string) => ReactNode }) {
  const [autenticado, setAutenticado] = useState(isAdminAuthenticated());
  const [estado, setEstado] = useState<Estado>('verificando');
  const [clave, setClave] = useState('');
  const [escrita, setEscrita] = useState('');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!autenticado) return;
    const candidata = getClaveCoordinacion() ?? getAdminPassword() ?? '';
    let vigente = true;
    setEstado('verificando');
    verificarClave(candidata)
      .then(() => {
        if (!vigente) return;
        setClaveCoordinacion(candidata);
        setClave(candidata);
        setEstado('listo');
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof ClaveInvalidaError) {
          setEstado('pedir');
        } else {
          setError(err instanceof Error ? err.message : 'No se pudo conectar con el servicio.');
          setEstado('error');
        }
      });
    return () => {
      vigente = false;
    };
  }, [autenticado, intento]);

  if (!autenticado) {
    return <AdminLogin onLogin={() => setAutenticado(true)} />;
  }

  if (estado === 'listo') return <>{children(clave)}</>;

  if (estado === 'verificando') return <p>Conectando con el servicio de constancias…</p>;

  if (estado === 'error') {
    return (
      <div className="admin-dashboard">
        <div className="alert-error">{error}</div>
        <button type="button" className="btn btn-secondary" onClick={() => setIntento((n) => n + 1)}>
          Reintentar
        </button>
      </div>
    );
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await verificarClave(escrita);
      setClaveCoordinacion(escrita);
      setClave(escrita);
      setEstado('listo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar la clave.');
    }
  };

  return (
    <div className="admin-login">
      <form onSubmit={enviar} className="admin-login-card">
        <h2>Clave de coordinación</h2>
        <p className="fechas-ayuda">
          Las constancias guardan datos personales: ingresa la clave de coordinación para verlas.
        </p>
        <label htmlFor="clave-coordinacion">Clave</label>
        <CampoClave id="clave-coordinacion" value={escrita} onChange={setEscrita} />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={!escrita}>
          Entrar
        </button>
      </form>
    </div>
  );
}
