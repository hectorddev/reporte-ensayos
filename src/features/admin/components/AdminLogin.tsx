import { useState } from 'react';
import { adminLogin } from '../api/admin.api';
import { setAdminPassword } from '../../../lib/adminAuth';
import { CampoClave } from './CampoClave';

interface Props {
  onLogin: () => void;
}

export function AdminLogin({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        <CampoClave id="admin-password" value={password} onChange={setPassword} placeholder="Contraseña de admin" />

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={loading || !password}>
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
