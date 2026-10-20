<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { errorMessages } from '@/api/http';
import { productsApi } from '@/api/products.api';
import type { LowStockResult } from '@/api/types';
import { formatNumber } from '@/utils/format';

/**
 * Alerta de reposición: consume GET /products/low-stock.
 * El umbral es editable; el valor inicial lo define la API (LOW_STOCK_DEFAULT_THRESHOLD).
 */
const emit = defineEmits<{ threshold: [value: number] }>();

const result = ref<LowStockResult | null>(null);
const threshold = ref<number | ''>('');
const error = ref<string | null>(null);
let debounce: number | undefined;

async function load(): Promise<void> {
  try {
    error.value = null;
    result.value = await productsApi.lowStock(threshold.value === '' ? undefined : threshold.value);
    if (threshold.value === '') threshold.value = result.value.threshold;
    emit('threshold', result.value.threshold);
  } catch (e) {
    error.value = errorMessages(e)[0] ?? null;
  }
}

watch(threshold, (value, previous) => {
  if (previous === '' || value === '' || value < 0) return; // valor inicial o campo vacío
  window.clearTimeout(debounce);
  debounce = window.setTimeout(load, 350);
});
onMounted(load);
</script>

<template>
  <section class="strip" aria-labelledby="low-stock-title">
    <div class="strip__head">
      <h2 id="low-stock-title" class="strip__title">
        <template v-if="result">
          <template v-if="result.total === 0">Ningún producto por debajo de</template>
          <template v-else>
            {{ result.total }} {{ result.total === 1 ? 'producto necesita' : 'productos necesitan' }} reposición: menos de
          </template>
        </template>
        <template v-else>Productos por debajo de</template>
      </h2>
      <label class="strip__threshold">
        <span class="visually-hidden">Mínimo de unidades</span>
        <input v-model.number="threshold" class="input num" type="number" min="0" max="1000000" />
        <span aria-hidden="true">unidades</span>
      </label>
    </div>

    <p v-if="error" class="notice" role="alert">{{ error }}</p>

    <ul v-else-if="result && result.total > 0" class="strip__list">
      <li v-for="product in result.data" :key="product.id">
        <RouterLink
          :to="{ name: 'product-detail', params: { id: product.id } }"
          :class="['chip', product.stock === 0 ? 'chip--out' : 'chip--low']"
        >
          <span class="chip__sku num">{{ product.sku }}</span>
          <span class="chip__name">{{ product.name }}</span>
          <span class="chip__stock num">{{ product.stock === 0 ? 'agotado' : formatNumber(product.stock) }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.strip {
  display: grid;
  gap: var(--s-3);
  padding: var(--s-4);
  border-left: 4px solid var(--ambar);
  border-radius: 0 var(--r-panel) var(--r-panel) 0;
  background: var(--superficie);
}

.strip__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
}

.strip__title {
  font-size: var(--t-md);
  font-weight: 600;
  font-variation-settings: 'wdth' var(--wdth-texto);
  letter-spacing: 0;
}

.strip__threshold {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  font-weight: 600;
}

.strip__threshold .input {
  width: 5.5rem;
  min-height: 2rem;
}

.strip__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: inline-flex;
  align-items: baseline;
  gap: var(--s-2);
  padding: var(--s-1) var(--s-3);
  border: 1px solid var(--linea);
  border-radius: var(--r-control);
  color: var(--tinta);
  font-size: var(--t-sm);
  text-decoration: none;
}

.chip:hover {
  border-color: var(--liquen);
}

.chip__sku {
  font-weight: 600;
}

.chip__name {
  color: var(--liquen);
}

.chip__stock {
  font-weight: 700;
}

.chip--low .chip__stock {
  color: var(--ambar);
}

.chip--out .chip__stock {
  color: var(--alerta);
}
</style>
