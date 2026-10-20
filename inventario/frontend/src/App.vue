<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/AppHeader.vue';
import ToastRegion from '@/components/ToastRegion.vue';

const route = useRoute();
const isPublic = computed(() => route.meta.public === true);
</script>

<template>
  <AppHeader v-if="!isPublic" />
  <main :class="isPublic ? 'main main--public' : 'main'">
    <RouterView />
  </main>
  <ToastRegion />
</template>

<style scoped>
.main {
  width: 100%;
  max-width: var(--ancho-contenido);
  margin: 0 auto;
  padding: var(--s-6) var(--s-4) var(--s-7);
}

.main--public {
  max-width: none;
  padding: 0;
}
</style>
