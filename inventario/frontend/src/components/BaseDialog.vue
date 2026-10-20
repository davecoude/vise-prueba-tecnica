<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

/**
 * Envoltorio de <dialog> nativo: foco atrapado, Esc para cerrar y fondo inerte
 * sin librerías (accesibilidad provista por el navegador).
 */
const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();

const dialog = ref<HTMLDialogElement | null>(null);

function sync(open: boolean): void {
  const el = dialog.value;
  if (!el) return;
  if (open && !el.open) el.showModal();
  if (!open && el.open) el.close();
}

watch(() => props.open, sync);
onMounted(() => sync(props.open));
</script>

<template>
  <dialog ref="dialog" class="dialog" :aria-label="title" @close="emit('close')">
    <h2 class="dialog__title">{{ title }}</h2>
    <slot />
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(32rem, calc(100vw - 2rem));
  padding: var(--s-5);
  border: 0;
  border-top: 4px solid var(--monte);
  border-radius: var(--r-panel);
  color: var(--tinta);
  box-shadow: 0 24px 60px rgb(24 36 28 / 0.28);
}

.dialog::backdrop {
  background: rgb(24 36 28 / 0.45);
}

.dialog__title {
  margin-bottom: var(--s-4);
}
</style>
