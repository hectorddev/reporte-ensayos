import { useState } from 'react';
import { adminLogin } from '../api/admin.api';
import { setAdminPassword } from '../../../lib/adminAuth';

interface Props {
  onLogin: () => void;
}

export function AdminLogin({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verClave, setVerClave] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await adminLogin(password);
      setAdminPassword(password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <form onSubmit={handleSubmit} className="admin-login-card">
        <h2>Acceso administrador</h2>
        <p className="fechas-ayuda">
          Ingresa la contraseña de administrador para gestionar los reportes.
        </p>

        <label htmlFor="admin-password">Contraseña</label>
        <div className="campo-clave">
          <input
            id="admin-password"
            type={verClave ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña de admin"
            autoComplete="current-password"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="ver-clave"
            onClick={() => setVerClave((v) => !v)}
            aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={verClave}
            title={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {verClave && <line x1="3" y1="3" x2="21" y2="21" />}
            </svg>
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading || !password}>
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
