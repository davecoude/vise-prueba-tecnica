import './styles/base.css';
import { createPinia } from 'pinia';
import { createApp, watch } from 'vue';
import { configureHttp } from './api/http';
import App from './App.vue';
import { router } from './router';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

const auth = useAuthStore(pinia);

/** Cierra la sesión (token expirado o rechazado) y vuelve al login conservando el destino. */
const endSession = (): void => {
  auth.logout();
  const current = router.currentRoute.value;
  if (current.name !== 'login') {
    void router.push({ name: 'login', query: { reason: 'expired', redirect: current.fullPath } });
  }
};

configureHttp({ getToken: auth.getToken, onUnauthorized: endSession });

// Cierre proactivo al vencer el token, sin esperar a que una petición falle
let expiryTimer: number | undefined;
watch(
  () => auth.expiresAt,
  (expiresAt) => {
    window.clearTimeout(expiryTimer);
    if (expiresAt) expiryTimer = window.setTimeout(endSession, Math.max(expiresAt - Date.now(), 0));
  },
  { immediate: true },
);

app.use(router);
app.mount('#app');
