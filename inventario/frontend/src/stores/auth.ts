import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '@/api/auth.api';

interface Session {
  token: string;
  email: string;
  /** Epoch en ms tomado del claim `exp` del JWT. */
  expiresAt: number;
}

/**
 * sessionStorage (no localStorage): la sesión muere al cerrar la pestaña,
 * lo que reduce la ventana de exposición del token.
 */
const STORAGE_KEY = 'vise.session';

/** Lee los claims sin verificar la firma: solo para UX (expiración, email). La API siempre verifica. */
function decodeClaims(token: string): { exp?: number; email?: string } {
  try {
    const payload = token.split('.')[1] ?? '';
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number; email?: string };
  } catch {
    return {};
  }
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const session = raw ? (JSON.parse(raw) as Session) : null;
    return session && session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(readSession());

  const isAuthenticated = computed(() => session.value !== null && session.value.expiresAt > Date.now());
  const email = computed(() => session.value?.email ?? '');
  const expiresAt = computed(() => session.value?.expiresAt ?? null);

  async function login(userEmail: string, password: string): Promise<void> {
    const { accessToken } = await authApi.login(userEmail, password);
    const claims = decodeClaims(accessToken);
    session.value = {
      token: accessToken,
      email: claims.email ?? userEmail,
      expiresAt: (claims.exp ?? 0) * 1000,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session.value));
    } catch {
      // Sin almacenamiento disponible la sesión vive solo en memoria
    }
  }

  function logout(): void {
    session.value = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada que limpiar
    }
  }

  const getToken = (): string | null => (isAuthenticated.value ? (session.value?.token ?? null) : null);

  return { isAuthenticated, email, expiresAt, login, logout, getToken };
});
