<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { errorMessages } from '@/api/http';
import logoUrl from '@/assets/vise-logo.png';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({ email: '', password: '' });
const errors = ref<string[]>([]);
const submitting = ref(false);
const expired = computed(() => route.query.reason === 'expired');

async function submit(): Promise<void> {
  errors.value = [];
  if (!form.email.trim() || !form.password) {
    errors.value = ['Escribe tu correo y tu contraseña.'];
    return;
  }
  submitting.value = true;
  try {
    await auth.login(form.email.trim(), form.password);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/productos';
    // Solo rutas internas: evita redirecciones abiertas a otros dominios
    await router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/productos');
  } catch (error) {
    errors.value = errorMessages(error);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login">
    <section class="login__panel" aria-labelledby="login-title">
      <img :src="logoUrl" alt="VISE" class="login__logo" width="160" height="72" />
      <h1 id="login-title">Inventario</h1>
      <p class="login__lead">Ingresa para consultar el stock y registrar entradas y salidas.</p>

      <p v-if="expired && !errors.length" class="login__info" role="status">
        Tu sesión expiró. Ingresa de nuevo para continuar.
      </p>

      <form class="login__form" novalidate @submit.prevent="submit">
        <div v-if="errors.length" class="notice" role="alert">
          <p v-for="message in errors" :key="message">{{ message }}</p>
        </div>

        <div class="field">
          <label class="field__label" for="login-email">Correo</label>
          <input id="login-email" v-model="form.email" class="input" type="email" autocomplete="username" required />
        </div>

        <div class="field">
          <label class="field__label" for="login-password">Contraseña</label>
          <input
            id="login-password"
            v-model="form.password"
            class="input"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <button type="submit" class="btn btn--primary login__submit" :disabled="submitting">
          {{ submitting ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: var(--s-4);
  /* Franja de marca a la izquierda: identidad sin competir con el logo */
  background: linear-gradient(90deg, var(--monte) 0 8px, var(--niebla) 8px);
}

.login__panel {
  display: grid;
  gap: var(--s-4);
  width: min(26rem, 100%);
  padding: var(--s-6);
  border-radius: var(--r-panel);
  background: var(--superficie);
  box-shadow: 0 1px 2px rgb(24 36 28 / 0.08);
}

.login__logo {
  height: 64px;
  width: auto;
}

.login__lead {
  color: var(--liquen);
}

.login__info {
  padding: var(--s-3) var(--s-4);
  border-left: 3px solid var(--indigo);
  background: var(--indigo-fondo);
  color: var(--indigo);
  font-size: var(--t-sm);
}

.login__form {
  display: grid;
  gap: var(--s-4);
}

.login__submit {
  width: 100%;
  min-height: 2.75rem;
  font-size: var(--t-md);
}
</style>
