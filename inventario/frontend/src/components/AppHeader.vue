<script setup lang="ts">
import { useRouter } from 'vue-router';
import logoUrl from '@/assets/vise-logo.png';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

function logout(): void {
  auth.logout();
  void router.push({ name: 'login' });
}
</script>

<template>
  <header class="header">
    <div class="header__inner">
      <RouterLink :to="{ name: 'products' }" class="header__brand">
        <img :src="logoUrl" alt="VISE" width="117" height="53" />
        <span class="header__product">Inventario</span>
      </RouterLink>
      <div class="header__session">
        <span class="header__email">{{ auth.email }}</span>
        <button type="button" class="btn btn--secondary" @click="logout">Cerrar sesión</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  background: var(--superficie);
  /* Franja institucional: el verde de marca como borde, no como fondo, para respetar el logo */
  border-bottom: 3px solid var(--monte);
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  max-width: var(--ancho-contenido);
  margin: 0 auto;
  padding: var(--s-2) var(--s-4);
}

.header__brand {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  color: var(--tinta);
  text-decoration: none;
}

.header__brand img {
  display: block;
  height: 44px;
  width: auto;
}

.header__product {
  padding-left: var(--s-3);
  border-left: 1px solid var(--linea);
  font-size: var(--t-lg);
  font-weight: 650;
  font-variation-settings: 'wdth' var(--wdth-display);
}

.header__session {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.header__email {
  font-size: var(--t-sm);
  color: var(--liquen);
}

@media (max-width: 640px) {
  .header__email,
  .header__product {
    display: none;
  }
}
</style>
