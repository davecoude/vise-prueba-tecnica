<script setup lang="ts">
import { computed, ref } from 'vue';
import { errorMessages } from '@/api/http';
import { movementsApi } from '@/api/movements.api';
import type { Movement, MovementType } from '@/api/types';
import { useNotificationsStore } from '@/stores/notifications';
import { formatUnits } from '@/utils/format';

const props = defineProps<{ productId: number; stock: number }>();
const emit = defineEmits<{ registered: [movement: Movement] }>();

const notifications = useNotificationsStore();

const type = ref<MovementType>('entrada');
const quantity = ref<number | ''>('');
const note = ref('');
const errors = ref<string[]>([]);
const saving = ref(false);

const actionLabel = computed(() => (type.value === 'entrada' ? 'Registrar entrada' : 'Registrar salida'));

function validate(): string | null {
  const value = quantity.value;
  if (value === '' || !Number.isInteger(value) || value < 1) return 'Escribe una cantidad entera mayor que 0.';
  if (value > 1_000_000) return 'La cantidad máxima por movimiento es 1.000.000.';
  // Pre-validación para UX; la regla autoritativa (con lock) vive en la API
  if (type.value === 'salida' && value > props.stock) {
    return props.stock === 0
      ? 'No hay unidades disponibles para registrar una salida.'
      : `Solo hay ${formatUnits(props.stock)} disponibles.`;
  }
  return null;
}

async function submit(): Promise<void> {
  const problem = validate();
  errors.value = problem ? [problem] : [];
  if (problem || quantity.value === '') return;

  saving.value = true;
  try {
    const movement = await movementsApi.register(props.productId, {
      type: type.value,
      quantity: quantity.value,
      note: note.value.trim() || undefined,
    });
    notifications.notify(type.value === 'entrada' ? 'Entrada registrada' : 'Salida registrada');
    quantity.value = '';
    note.value = '';
    emit('registered', movement);
  } catch (error) {
    errors.value = errorMessages(error);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="movement" novalidate @submit.prevent="submit">
    <h2>Registrar movimiento</h2>

    <fieldset class="movement__type">
      <legend class="visually-hidden">Tipo de movimiento</legend>
      <label :class="['type', 'type--entrada', { 'type--active': type === 'entrada' }]">
        <input v-model="type" type="radio" name="movement-type" value="entrada" />
        Entrada
      </label>
      <label :class="['type', 'type--salida', { 'type--active': type === 'salida' }]">
        <input v-model="type" type="radio" name="movement-type" value="salida" />
        Salida
      </label>
    </fieldset>

    <div class="field">
      <label class="field__label" for="movement-quantity">Cantidad</label>
      <input
        id="movement-quantity"
        v-model.number="quantity"
        class="input num"
        type="number"
        min="1"
        step="1"
        inputmode="numeric"
        :aria-invalid="errors.length > 0"
      />
      <p class="field__hint num">Disponible: {{ formatUnits(stock) }}</p>
    </div>

    <div class="field">
      <label class="field__label" for="movement-note">Nota <span class="optional">(opcional)</span></label>
      <textarea id="movement-note" v-model="note" class="input" rows="2" maxlength="255" />
    </div>

    <div v-if="errors.length" class="notice" role="alert">
      <p v-for="message in errors" :key="message">{{ message }}</p>
    </div>

    <button type="submit" :class="['btn', 'btn--primary', `btn--${type}`]" :disabled="saving">
      {{ saving ? 'Registrando…' : actionLabel }}
    </button>
  </form>
</template>

<style scoped>
.movement {
  display: grid;
  gap: var(--s-4);
  padding: var(--s-5);
  border-radius: var(--r-panel);
  background: var(--superficie);
  border: 1px solid var(--linea-suave);
}

.movement__type {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0;
  padding: 0;
  border: 0;
}

.type {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  border: 1px solid var(--linea);
  font-size: var(--t-sm);
  font-weight: 600;
  color: var(--liquen);
  cursor: pointer;
}

.type:first-of-type {
  border-radius: var(--r-control) 0 0 var(--r-control);
}

.type:last-of-type {
  border-left: 0;
  border-radius: 0 var(--r-control) var(--r-control) 0;
}

.type input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.type:has(input:focus-visible) {
  outline: 2px solid var(--indigo);
  outline-offset: 2px;
}

.type--entrada.type--active {
  background: var(--hoja-fondo);
  border-color: var(--hoja);
  color: var(--hoja);
}

.type--salida.type--active {
  background: var(--indigo-fondo);
  border-color: var(--indigo);
  color: var(--indigo);
}

.optional {
  font-weight: 400;
  color: var(--liquen);
}

/* El botón adopta el color del tipo de movimiento elegido */
.btn--entrada {
  background: var(--hoja);
}

.btn--salida {
  background: var(--indigo);
}

.btn--entrada:hover:not(:disabled) {
  background: #256a29;
}

.btn--salida:hover:not(:disabled) {
  background: #193f72;
}
</style>
