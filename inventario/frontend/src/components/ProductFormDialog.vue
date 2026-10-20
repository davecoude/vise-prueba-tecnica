<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { errorMessages } from '@/api/http';
import { productsApi } from '@/api/products.api';
import type { Category, Product, ProductInput } from '@/api/types';
import BaseDialog from '@/components/BaseDialog.vue';
import { useNotificationsStore } from '@/stores/notifications';

const props = defineProps<{ open: boolean; product: Product | null; categories: Category[] }>();
const emit = defineEmits<{ close: []; saved: [product: Product] }>();

const notifications = useNotificationsStore();
const isEdit = computed(() => props.product !== null);

const form = reactive({ name: '', sku: '', categoryId: '', price: '' });
const fieldErrors = reactive<Partial<Record<keyof typeof form, string>>>({});
const serverErrors = ref<string[]>([]);
const saving = ref(false);

// Cada vez que se abre, el formulario parte del producto (edición) o vacío (creación)
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    form.name = props.product?.name ?? '';
    form.sku = props.product?.sku ?? '';
    form.categoryId = props.product ? String(props.product.categoryId) : '';
    form.price = props.product ? String(props.product.price) : '';
    for (const key of Object.keys(fieldErrors) as (keyof typeof form)[]) delete fieldErrors[key];
    serverErrors.value = [];
  },
);

/** Validación en el cliente: misma regla que el backend, para responder sin ir al servidor. */
function validate(): ProductInput | null {
  for (const key of Object.keys(fieldErrors) as (keyof typeof form)[]) delete fieldErrors[key];
  const name = form.name.trim();
  const sku = form.sku.trim().toUpperCase();
  const price = Number(form.price.replace(',', '.'));

  if (name.length < 2 || name.length > 150) fieldErrors.name = 'Escribe un nombre de 2 a 150 caracteres.';
  if (!/^[A-Z0-9-]{3,50}$/.test(sku)) fieldErrors.sku = 'Usa de 3 a 50 letras, números o guiones.';
  if (!form.categoryId) fieldErrors.categoryId = 'Elige una categoría.';
  if (form.price.trim() === '' || !Number.isFinite(price) || price < 0) {
    fieldErrors.price = 'Escribe un precio mayor o igual a 0.';
  } else if (!/^\d+([.,]\d{1,2})?$/.test(form.price.trim())) {
    fieldErrors.price = 'Usa máximo 2 decimales.';
  }

  if (Object.keys(fieldErrors).length > 0) return null;
  return { name, sku, categoryId: Number(form.categoryId), price };
}

async function submit(): Promise<void> {
  const input = validate();
  if (!input) return;
  saving.value = true;
  serverErrors.value = [];
  try {
    const saved = props.product
      ? await productsApi.update(props.product.id, input)
      : await productsApi.create(input);
    notifications.notify(isEdit.value ? 'Cambios guardados' : 'Producto creado');
    emit('saved', saved);
  } catch (error) {
    serverErrors.value = errorMessages(error);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseDialog :open="open" :title="isEdit ? 'Editar producto' : 'Nuevo producto'" @close="emit('close')">
    <form class="form" novalidate @submit.prevent="submit">
      <div v-if="serverErrors.length" class="notice" role="alert">
        <p v-if="serverErrors.length === 1">{{ serverErrors[0] }}</p>
        <ul v-else>
          <li v-for="message in serverErrors" :key="message">{{ message }}</li>
        </ul>
      </div>

      <div class="field">
        <label class="field__label" for="product-name">Nombre</label>
        <input
          id="product-name"
          v-model="form.name"
          class="input"
          maxlength="150"
          autocomplete="off"
          :aria-invalid="Boolean(fieldErrors.name)"
          aria-describedby="product-name-error"
        />
        <p v-if="fieldErrors.name" id="product-name-error" class="field__error">{{ fieldErrors.name }}</p>
      </div>

      <div class="form__row">
        <div class="field">
          <label class="field__label" for="product-sku">SKU</label>
          <input
            id="product-sku"
            v-model="form.sku"
            class="input num"
            maxlength="50"
            autocomplete="off"
            spellcheck="false"
            :aria-invalid="Boolean(fieldErrors.sku)"
            aria-describedby="product-sku-hint"
          />
          <p v-if="fieldErrors.sku" class="field__error">{{ fieldErrors.sku }}</p>
          <p v-else id="product-sku-hint" class="field__hint">Se guarda en mayúsculas. Ej.: ELEC-004</p>
        </div>

        <div class="field">
          <label class="field__label" for="product-price">Precio (COP)</label>
          <input
            id="product-price"
            v-model="form.price"
            class="input num"
            inputmode="decimal"
            autocomplete="off"
            :aria-invalid="Boolean(fieldErrors.price)"
          />
          <p v-if="fieldErrors.price" class="field__error">{{ fieldErrors.price }}</p>
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="product-category">Categoría</label>
        <select
          id="product-category"
          v-model="form.categoryId"
          class="input"
          :aria-invalid="Boolean(fieldErrors.categoryId)"
        >
          <option value="" disabled>Elige una categoría</option>
          <option v-for="category in categories" :key="category.id" :value="String(category.id)">
            {{ category.name }}
          </option>
        </select>
        <p v-if="fieldErrors.categoryId" class="field__error">{{ fieldErrors.categoryId }}</p>
      </div>

      <p v-if="!isEdit" class="field__hint">El producto se crea con 0 unidades. El stock se carga registrando una entrada.</p>

      <div class="form__actions">
        <button type="button" class="btn btn--secondary" @click="emit('close')">Cancelar</button>
        <button type="submit" class="btn btn--primary" :disabled="saving">
          {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear producto' }}
        </button>
      </div>
    </form>
  </BaseDialog>
</template>

<style scoped>
.form {
  display: grid;
  gap: var(--s-4);
}

.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-4);
}

.form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--s-3);
  padding-top: var(--s-2);
}

@media (max-width: 480px) {
  .form__row {
    grid-template-columns: 1fr;
  }
}
</style>
