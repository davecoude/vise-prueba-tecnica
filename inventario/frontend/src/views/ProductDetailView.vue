<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { categoriesApi } from '@/api/categories.api';
import { ApiError, errorMessages } from '@/api/http';
import { movementsApi } from '@/api/movements.api';
import { productsApi } from '@/api/products.api';
import type { Category, Kardex, Movement, Product } from '@/api/types';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import KardexLedger from '@/components/KardexLedger.vue';
import MovementForm from '@/components/MovementForm.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import ProductFormDialog from '@/components/ProductFormDialog.vue';
import StockStatus from '@/components/StockStatus.vue';
import { useInventoryStore } from '@/stores/inventory';
import { useNotificationsStore } from '@/stores/notifications';
import { formatNumber, formatPrice } from '@/utils/format';

const KARDEX_PAGE_SIZE = 15;

const props = defineProps<{ id: number }>();
const router = useRouter();
const inventory = useInventoryStore();
const notifications = useNotificationsStore();

const product = ref<Product | null>(null);
const kardex = ref<Kardex | null>(null);
const categories = ref<Category[]>([]);
const notFound = ref(false);
const loadError = ref<string[]>([]);
const highlightId = ref<number | null>(null);

const editOpen = ref(false);
const deleteOpen = ref(false);
const deleting = ref(false);
const deleteErrors = ref<string[]>([]);

async function loadProduct(): Promise<void> {
  try {
    product.value = await productsApi.get(props.id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound.value = true;
    else loadError.value = errorMessages(error);
  }
}

/** Sin página explícita abre la última: los movimientos más recientes quedan a la vista. */
async function loadKardex(page?: number): Promise<void> {
  try {
    const first = await movementsApi.kardex(props.id, page ?? 1, KARDEX_PAGE_SIZE);
    kardex.value =
      page === undefined && first.meta.totalPages > 1
        ? await movementsApi.kardex(props.id, first.meta.totalPages, KARDEX_PAGE_SIZE)
        : first;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) loadError.value = errorMessages(error);
  }
}

async function load(): Promise<void> {
  notFound.value = false;
  loadError.value = [];
  highlightId.value = null;
  await Promise.all([loadProduct(), loadKardex()]);
}

async function onRegistered(movement: Movement): Promise<void> {
  highlightId.value = movement.id;
  await Promise.all([loadProduct(), loadKardex()]);
}

async function openEdit(): Promise<void> {
  if (categories.value.length === 0) {
    try {
      categories.value = await categoriesApi.list();
    } catch (error) {
      loadError.value = errorMessages(error);
      return;
    }
  }
  editOpen.value = true;
}

function onSaved(saved: Product): void {
  editOpen.value = false;
  product.value = saved;
}

function openDelete(): void {
  deleteErrors.value = [];
  deleteOpen.value = true;
}

async function confirmDelete(): Promise<void> {
  deleting.value = true;
  try {
    await productsApi.remove(props.id);
    deleteOpen.value = false;
    notifications.notify('Producto eliminado');
    await router.push({ name: 'products' });
  } catch (error) {
    deleteErrors.value = errorMessages(error);
  } finally {
    deleting.value = false;
  }
}

watch(() => props.id, load);
onMounted(load);
</script>

<template>
  <div class="detail">
    <nav class="breadcrumb" aria-label="Ruta de navegación">
      <RouterLink :to="{ name: 'products' }">Productos</RouterLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page" class="num">{{ product?.sku ?? '…' }}</span>
    </nav>

    <section v-if="notFound" class="empty">
      <h1>No encontramos este producto</h1>
      <p>Puede que haya sido eliminado. Vuelve a la lista para buscar otro.</p>
      <RouterLink :to="{ name: 'products' }" class="btn btn--primary">Ver productos</RouterLink>
    </section>

    <div v-else-if="loadError.length" class="notice" role="alert">
      <p v-for="message in loadError" :key="message">{{ message }}</p>
      <button type="button" class="btn btn--secondary retry" @click="load">Reintentar</button>
    </div>

    <template v-else-if="product">
      <header class="detail__header">
        <div class="detail__title">
          <h1>{{ product.name }}</h1>
          <dl class="facts">
            <div>
              <dt>SKU</dt>
              <dd class="num">{{ product.sku }}</dd>
            </div>
            <div>
              <dt>Categoría</dt>
              <dd>{{ product.category?.name }}</dd>
            </div>
            <div>
              <dt>Precio</dt>
              <dd class="num">{{ formatPrice(product.price) }}</dd>
            </div>
          </dl>
        </div>
        <div class="detail__actions">
          <button type="button" class="btn btn--secondary" @click="openEdit">Editar producto</button>
          <button type="button" class="btn btn--ghost" @click="openDelete">Eliminar</button>
        </div>
      </header>

      <p class="stock-line">
        <span class="stock-line__value num">{{ formatNumber(product.stock) }}</span>
        <span>{{ product.stock === 1 ? 'unidad en stock' : 'unidades en stock' }}</span>
        <StockStatus :stock="product.stock" :threshold="inventory.lowStockThreshold" />
      </p>

      <div class="detail__body">
        <section class="detail__kardex" aria-labelledby="kardex-title">
          <h2 id="kardex-title">Kardex</h2>
          <template v-if="kardex">
            <p v-if="kardex.data.length === 0" class="empty">
              Este producto aún no tiene movimientos. Registra una entrada para cargar su stock.
            </p>
            <template v-else>
              <KardexLedger :movements="kardex.data" :highlight-id="highlightId" />
              <PaginationBar :meta="kardex.meta" noun="movimientos" @change="loadKardex" />
            </template>
          </template>
        </section>

        <aside class="detail__aside">
          <MovementForm :product-id="product.id" :stock="product.stock" @registered="onRegistered" />
        </aside>
      </div>

      <ProductFormDialog
        :open="editOpen"
        :product="product"
        :categories="categories"
        @close="editOpen = false"
        @saved="onSaved"
      />
      <ConfirmDialog
        :open="deleteOpen"
        title="Eliminar producto"
        :message="`Se eliminará ${product.name} (${product.sku}). Solo es posible si no tiene movimientos registrados.`"
        confirm-label="Eliminar producto"
        :busy="deleting"
        :errors="deleteErrors"
        @close="deleteOpen = false"
        @confirm="confirmDelete"
      />
    </template>
  </div>
</template>

<style scoped>
.detail {
  display: grid;
  gap: var(--s-5);
}

.breadcrumb {
  display: flex;
  gap: var(--s-2);
  font-size: var(--t-sm);
  color: var(--liquen);
}

.breadcrumb a {
  color: var(--indigo);
  font-weight: 600;
}

.detail__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-4);
}

.detail__title {
  display: grid;
  gap: var(--s-3);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-5);
  margin: 0;
}

.facts dt {
  font-size: var(--t-xs);
  color: var(--liquen);
}

.facts dd {
  margin: 0;
  font-weight: 600;
}

.detail__actions {
  display: flex;
  gap: var(--s-2);
}

/* El stock se lee como una frase: la cifra manda, el contexto la acompaña */
.stock-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--s-2);
  padding-bottom: var(--s-4);
  border-bottom: 1px solid var(--linea);
  font-size: var(--t-lg);
}

.stock-line__value {
  font-size: 3.5rem;
  font-weight: 750;
  line-height: 1;
  font-variation-settings: 'wdth' var(--wdth-display);
  color: var(--monte);
}

.detail__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20rem;
  align-items: start;
  gap: var(--s-5);
}

.detail__kardex {
  display: grid;
  gap: var(--s-3);
}

.detail__aside {
  position: sticky;
  top: var(--s-4);
}

.empty {
  display: grid;
  gap: var(--s-3);
  justify-items: start;
  padding: var(--s-5);
  border: 1px dashed var(--linea);
  border-radius: var(--r-panel);
  background: var(--superficie);
}

.retry {
  margin-top: var(--s-3);
}

@media (max-width: 900px) {
  .detail__body {
    grid-template-columns: 1fr;
  }

  /* En móvil el formulario va primero: es la acción más frecuente */
  .detail__aside {
    position: static;
    order: -1;
  }
}
</style>
