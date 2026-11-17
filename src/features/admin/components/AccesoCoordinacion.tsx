import { useEffect, useState, type ReactNode } from 'react';
import { AdminLogin } from './AdminLogin';
import { cerrarSesion, getClaveCoordinacion } from '../../../lib/adminAuth';
import { ClaveInvalidaError, verificarClave } from '../../constancias/api/constancias.api';

/**
 * Puerta de las páginas de constancias del panel. Pide la clave de coordinación
 * si no hay sesión; si la hay, la vuelve a comprobar una vez por si cambió en el
 * servidor (en ese caso la pide de nuevo).
 */
export function AccesoCoordinacion({ children }: { children: (clave: string) => ReactNode }) {
  const [clave, setClave] = useState(getClaveCoordinacion);
  const [verificada, setVerificada] = useState(false);
  const [cambio, setCambio] = useState(false);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!clave || verificada) return;
    let vigente = true;
    verificarClave(clave)
      .then(() => vigente && setVerificada(true))
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof ClaveInvalidaError) {
          cerrarSesion();
          setCambio(true);
          setClave(null);
        } else {
          setError(err instanceof Error ? err.message : 'No se pudo conectar con el servicio.');
        }
      });
    return () => {
      vigente = false;
    };
  }, [clave, verificada, intento]);

  if (!clave) {
    return (
      <AdminLogin
        aviso={cambio ? 'La clave de coordinación cambió. Ingresa la nueva.' : undefined}
        onLogin={() => {
          setClave(getClaveCoordinacion());
          setVerificada(true);
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="alert-error">{error}</div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setError('');
            setIntento((n) => n + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!verificada) return <p>Verificando acceso…</p>;

  return <>{children(clave)}</>;
}
