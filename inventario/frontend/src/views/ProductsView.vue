<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { categoriesApi } from '@/api/categories.api';
import { errorMessages } from '@/api/http';
import { productsApi } from '@/api/products.api';
import type { Category, Paginated, Product } from '@/api/types';
import LowStockStrip from '@/components/LowStockStrip.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import ProductFormDialog from '@/components/ProductFormDialog.vue';
import StockStatus from '@/components/StockStatus.vue';
import { useInventoryStore } from '@/stores/inventory';
import { formatNumber, formatPrice } from '@/utils/format';

const PAGE_SIZE = 10;

const route = useRoute();
const router = useRouter();
const inventory = useInventoryStore();

const categories = ref<Category[]>([]);
const result = ref<Paginated<Product> | null>(null);
const loading = ref(false);
const loadError = ref<string[]>([]);
const formOpen = ref(false);

/**
 * Los filtros viven en la URL (?page&categoryId&search): se pueden compartir,
 * recargar y navegar con atrás/adelante sin perder el estado.
 */
const filters = computed(() => ({
  page: Number(route.query.page) > 0 ? Number(route.query.page) : 1,
  categoryId: Number(route.query.categoryId) > 0 ? Number(route.query.categoryId) : undefined,
  search: typeof route.query.search === 'string' ? route.query.search : '',
}));

const searchInput = ref(filters.value.search);
let searchDebounce: number | undefined;

function updateQuery(changes: Record<string, string | number | undefined>): void {
  const query = { ...route.query, ...changes };
  for (const key of Object.keys(query)) {
    if (query[key] === undefined || query[key] === '') delete query[key];
  }
  void router.replace({ query });
}

async function loadProducts(): Promise<void> {
  loading.value = true;
  loadError.value = [];
  try {
    const { page, categoryId, search } = filters.value;
    result.value = await productsApi.list({ page, limit: PAGE_SIZE, categoryId, search: search || undefined });
  } catch (error) {
    loadError.value = errorMessages(error);
  } finally {
    loading.value = false;
  }
}

watch(searchInput, (value) => {
  window.clearTimeout(searchDebounce);
  searchDebounce = window.setTimeout(() => updateQuery({ search: value.trim() || undefined, page: undefined }), 300);
});
watch(filters, loadProducts);

onMounted(async () => {
  void loadProducts();
  try {
    categories.value = await categoriesApi.list();
  } catch {
    // El filtro de categoría queda vacío; el listado sigue funcionando
  }
});

const hasFilters = computed(() => Boolean(filters.value.search || filters.value.categoryId));

function clearFilters(): void {
  searchInput.value = '';
  void router.replace({ query: {} });
}

function onSaved(product: Product): void {
  formOpen.value = false;
  void router.push({ name: 'product-detail', params: { id: product.id } });
}
</script>

<template>
  <div class="products">
    <header class="products__header">
      <div>
        <h1>Productos</h1>
        <p v-if="result" class="products__count num">
          {{ formatNumber(result.meta.total) }} {{ result.meta.total === 1 ? 'producto' : 'productos' }}
          {{ hasFilters ? 'coinciden con los filtros' : 'registrados' }}
        </p>
      </div>
      <button type="button" class="btn btn--primary" @click="formOpen = true">Nuevo producto</button>
    </header>

    <LowStockStrip @threshold="inventory.lowStockThreshold = $event" />

    <div class="filters" role="search">
      <div class="field filters__search">
        <label class="field__label" for="filter-search">Buscar</label>
        <input
          id="filter-search"
          v-model="searchInput"
          class="input"
          type="search"
          placeholder="Nombre o SKU"
          maxlength="100"
        />
      </div>
      <div class="field">
        <label class="field__label" for="filter-category">Categoría</label>
        <select
          id="filter-category"
          class="input"
          :value="filters.categoryId ?? ''"
          @change="updateQuery({ categoryId: ($event.target as HTMLSelectElement).value || undefined, page: undefined })"
        >
          <option value="">Todas las categorías</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="loadError.length" class="notice" role="alert">
      <p v-for="message in loadError" :key="message">{{ message }}</p>
      <button type="button" class="btn btn--secondary retry" @click="loadProducts">Reintentar</button>
    </div>

    <template v-else-if="result">
      <div v-if="result.data.length === 0" class="empty">
        <template v-if="hasFilters">
          <p>Ningún producto coincide con los filtros.</p>
          <button type="button" class="btn btn--secondary" @click="clearFilters">Limpiar filtros</button>
        </template>
        <template v-else>
          <p>Aún no hay productos. Crea el primero para empezar a registrar movimientos.</p>
          <button type="button" class="btn btn--primary" @click="formOpen = true">Nuevo producto</button>
        </template>
      </div>

      <div v-else class="table-wrap" :aria-busy="loading">
        <table class="table">
          <caption class="visually-hidden">
            Productos del inventario
          </caption>
          <thead>
            <tr>
              <th scope="col">SKU</th>
              <th scope="col">Producto</th>
              <th scope="col" class="table__optional">Categoría</th>
              <th scope="col" class="table__num table__optional">Precio</th>
              <th scope="col" class="table__num">Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in result.data" :key="product.id">
              <td class="table__sku num">{{ product.sku }}</td>
              <td>
                <RouterLink :to="{ name: 'product-detail', params: { id: product.id } }" class="table__link">
                  {{ product.name }}
                </RouterLink>
              </td>
              <td class="table__muted table__optional">{{ product.category?.name }}</td>
              <td class="table__num table__optional num">{{ formatPrice(product.price) }}</td>
              <td class="table__num">
                <span class="table__stock">
                  <StockStatus :stock="product.stock" :threshold="inventory.lowStockThreshold" />
                  <span class="num">{{ formatNumber(product.stock) }}</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar :meta="result.meta" noun="productos" @change="updateQuery({ page: $event })" />
    </template>

    <ProductFormDialog
      :open="formOpen"
      :product="null"
      :categories="categories"
      @close="formOpen = false"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
.products {
  display: grid;
  gap: var(--s-5);
}

.products__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-4);
}

.products__count {
  margin-top: var(--s-1);
  color: var(--liquen);
}

.filters {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--s-4);
}

.retry {
  margin-top: var(--s-3);
}

.empty {
  display: grid;
  gap: var(--s-3);
  justify-items: start;
  padding: var(--s-6) var(--s-5);
  border: 1px dashed var(--linea);
  border-radius: var(--r-panel);
  background: var(--superficie);
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--linea-suave);
  border-radius: var(--r-panel);
  background: var(--superficie);
}

.table-wrap[aria-busy='true'] {
  opacity: 0.6;
}

.table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: var(--t-sm);
}

.table th {
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--linea);
  color: var(--liquen);
  font-weight: 600;
  text-align: left;
}

.table td {
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--linea-suave);
}

.table tbody tr:last-child td {
  border-bottom: 0;
}

.table tbody tr:hover {
  background: #f9fbfa;
}

.table__sku {
  font-weight: 600;
  white-space: nowrap;
}

.table__link {
  color: var(--tinta);
  font-weight: 600;
  text-decoration-color: var(--linea);
  text-underline-offset: 3px;
}

.table__link:hover {
  color: var(--indigo);
  text-decoration-color: currentColor;
}

.table__muted {
  color: var(--liquen);
}

.table__num,
.table th.table__num {
  text-align: right;
  white-space: nowrap;
}

.table__stock {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  font-weight: 700;
}

@media (max-width: 640px) {
  .filters {
    grid-template-columns: 1fr;
  }

  /* En pantallas pequeñas se priorizan SKU, nombre y stock; el detalle está a un toque */
  .table {
    min-width: 0;
  }

  .table__optional {
    display: none;
  }

  .table th,
  .table td {
    padding: var(--s-3);
  }
}
</style>
