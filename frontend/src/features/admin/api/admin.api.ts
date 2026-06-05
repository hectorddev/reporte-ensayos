import { getApiBase } from '../../../lib/api';
import { getAdminPassword } from '../../../lib/adminAuth';
import type {
  ReporteMensualFormData,
  ReporteMensualGuardado,
  ReporteMensualResponse,
} from '../../reporte-mensual/types/reporteMensual.types';

const API = `${getApiBase()}/admin`;

function adminHeaders(): HeadersInit {
  const password = getAdminPassword();
  return {
    'Content-Type': 'application/json',
    ...(password ? { 'X-Admin-Password': password } : {}),
  };
}

async function fetchAdmin<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...adminHeaders(),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    throw new Error('Sesión de administrador expirada o no autorizada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Error en la solicitud');
  }

  return res.json();
}

export async function adminLogin(password: string): Promise<void> {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Contraseña incorrecta' }));
    throw new Error(err.error ?? 'Contraseña incorrecta');
  }
}

export function fetchAdminReportes(): Promise<ReporteMensualGuardado[]> {
  return fetchAdmin(`${API}/reportes-mensuales`);
}

export function fetchAdminReporte(id: string): Promise<ReporteMensualGuardado> {
  return fetchAdmin(`${API}/reportes-mensuales/${id}`);
}

export function actualizarAdminReporte(
  id: string,
  data: ReporteMensualFormData
): Promise<ReporteMensualResponse> {
  return fetchAdmin(`${API}/reportes-mensuales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function eliminarAdminReporte(id: string): Promise<{ mensaje: string }> {
  return fetchAdmin(`${API}/reportes-mensuales/${id}`, {
    method: 'DELETE',
  });
}
