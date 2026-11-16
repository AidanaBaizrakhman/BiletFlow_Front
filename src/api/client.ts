/**
 * Thin API client. When VITE_API_BASE_URL is set, requests go to the real backend;
 * otherwise each adapter's typed mock handler runs against the in-browser mock DB.
 * Every adapter declares its REST route so wiring the backend is a config change.
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
export const API_BASE = env.VITE_API_BASE_URL ?? '';
const MOCK_LATENCY_MS = 250;

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function call<T>(
  method: Method,
  path: string,
  mock: () => T,
  body?: unknown
): Promise<T> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = res.statusText;
      let code: string | undefined;
      try {
        const j = (await res.json()) as { message?: string; code?: string };
        msg = j.message ?? msg;
        code = j.code;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(res.status, msg, code);
    }
    return (await res.json()) as T;
  }
  await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
  // structuredClone so callers can never mutate mock DB rows by reference
  return structuredClone(mock());
}

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};
