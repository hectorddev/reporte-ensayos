import { getApiBase } from '../../../lib/api';
import type {
  Agrupacion,
  ReporteMensualFormData,
  ReporteMensualGuardado,
  ReporteMensualResponse,
} from '../types/reporteMensual.types';

const API = getApiBase();

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Error en la solicitud');
  }
  return res.json();
}

export function fetchAgrupaciones(): Promise<Agrupacion[]> {
  return fetchJson(`${API}/agrupaciones`);
}

export interface FiltrosReportes {
  agrupacionId?: string;
  anio?: number;
  mes?: number;
}

export function fetchReportesMensuales(filtros?: FiltrosReportes): Promise<ReporteMensualGuardado[]> {
  const params = new URLSearchParams();
  if (filtros?.agrupacionId) params.set('agrupacionId', filtros.agrupacionId);
  if (filtros?.anio) params.set('anio', String(filtros.anio));
  if (filtros?.mes) params.set('mes', String(filtros.mes));
  const query = params.toString();
  return fetchJson(`${API}/reportes-mensuales${query ? `?${query}` : ''}`);
}

export function submitReporteMensual(data: ReporteMensualFormData): Promise<ReporteMensualResponse> {
  return fetchJson<ReporteMensualResponse>(`${API}/reportes-mensuales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
