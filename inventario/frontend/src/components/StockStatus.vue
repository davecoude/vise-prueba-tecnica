<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ stock: number; threshold: number }>();

const status = computed(() => {
  if (props.stock === 0) return { label: 'Agotado', tone: 'out' };
  if (props.stock < props.threshold) return { label: 'Bajo mínimo', tone: 'low' };
  return null;
});
</script>

<template>
  <span v-if="status" :class="['status', `status--${status.tone}`]">{{ status.label }}</span>
</template>

<style scoped>
.status {
  display: inline-block;
  padding: 0 var(--s-2);
  border-radius: var(--r-control);
  font-size: var(--t-xs);
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
}

.status--low {
  background: var(--ambar-fondo);
  color: var(--ambar);
}

.status--out {
  background: var(--alerta-fondo);
  color: var(--alerta);
}
</style>
