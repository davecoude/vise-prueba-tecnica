/**
 * Cliente HTTP mínimo sobre fetch.
 * - Inyecta el JWT y normaliza los errores de la API en ApiError.
 * - No conoce el store ni el router: recibe esos colaboradores por configureHttp
 *   (inversión de dependencias → la capa de datos no depende de la UI).
 */

export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join(' '));
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** false para endpoints públicos (login): ni envía token ni dispara el cierre de sesión. */
  auth?: boolean;
}

interface HttpHooks {
  getToken: () => string | null;
  onUnauthorized: () => void;
}

const BASE_URL = '/api';
let hooks: HttpHooks = { getToken: () => null, onUnauthorized: () => undefined };

export const configureHttp = (config: HttpHooks): void => {
  hooks = config;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;

  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? hooks.getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, ['No hay conexión con el servidor. Verifica que la API esté en ejecución.']);
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && auth) hooks.onUnauthorized();
    throw new ApiError(response.status, extractMessages(payload, response.status));
  }
  return payload as T;
}

function extractMessages(payload: unknown, status: number): string[] {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const { message } = payload as { message: unknown };
    if (Array.isArray(message)) return message.map(String);
    if (typeof message === 'string') return [message];
  }
  return status >= 500
    ? ['El servidor no pudo completar la operación. Inténtalo de nuevo en unos minutos.']
    : [`La solicitud falló (código ${status}).`];
}

/** Mensajes legibles para cualquier error capturado en la UI. */
export const errorMessages = (error: unknown): string[] =>
  error instanceof ApiError ? error.messages : ['Ocurrió un error inesperado.'];
