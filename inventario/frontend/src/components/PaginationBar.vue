<script setup lang="ts">
import { computed } from 'vue';
import type { PaginationMeta } from '@/api/types';
import { formatNumber } from '@/utils/format';

const props = defineProps<{ meta: PaginationMeta; noun: string }>();
const emit = defineEmits<{ change: [page: number] }>();

const range = computed(() => {
  const { page, limit, total } = props.meta;
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  return { from, to: Math.min(page * limit, total) };
});
</script>

<template>
  <nav v-if="meta.total > 0" class="pagination" aria-label="Paginación">
    <p class="pagination__summary num">
      {{ formatNumber(range!.from) }}–{{ formatNumber(range!.to) }} de {{ formatNumber(meta.total) }} {{ noun }}
    </p>
    <div v-if="meta.totalPages > 1" class="pagination__controls">
      <button
        type="button"
        class="btn btn--secondary"
        :disabled="meta.page <= 1"
        @click="emit('change', meta.page - 1)"
      >
        Anterior
      </button>
      <span class="pagination__page num" aria-current="page">Página {{ meta.page }} de {{ meta.totalPages }}</span>
      <button
        type="button"
        class="btn btn--secondary"
        :disabled="meta.page >= meta.totalPages"
        @click="emit('change', meta.page + 1)"
      >
        Siguiente
      </button>
    </div>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  padding-top: var(--s-4);
}

.pagination__summary,
.pagination__page {
  font-size: var(--t-sm);
  color: var(--liquen);
}

.pagination__controls {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}
</style>
