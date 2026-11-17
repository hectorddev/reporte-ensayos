import { useState } from 'react';
import { setClaveCoordinacion } from '../../../lib/adminAuth';
import { ClaveInvalidaError, verificarClave } from '../../constancias/api/constancias.api';
import { CampoClave } from './CampoClave';

interface Props {
  onLogin: () => void;
  /** Mensaje opcional sobre el formulario (p. ej. la clave cambió). */
  aviso?: string;
}

/** Entrada al panel con la clave de coordinación; la valida el servicio, no el sitio. */
export function AdminLogin({ onLogin, aviso }: Props) {
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verificarClave(clave);
      setClaveCoordinacion(clave);
      onLogin();
    } catch (err) {
      if (err instanceof ClaveInvalidaError) setError('Clave incorrecta.');
      else setError(err instanceof Error ? err.message : 'No se pudo verificar la clave.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <form onSubmit={handleSubmit} className="admin-login-card">
        <h2>Acceso coordinación</h2>
        <p className="fechas-ayuda">Ingresa la clave de coordinación para gestionar reportes y constancias.</p>
        {aviso && <p className="error">{aviso}</p>}

        <label htmlFor="clave-coordinacion">Clave de coordinación</label>
        <CampoClave id="clave-coordinacion" value={clave} onChange={setClave} placeholder="Clave de coordinación" />

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading || !clave}>
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
