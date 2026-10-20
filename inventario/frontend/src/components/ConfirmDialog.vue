<script setup lang="ts">
import BaseDialog from '@/components/BaseDialog.vue';

defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  errors?: string[];
}>();
const emit = defineEmits<{ close: []; confirm: [] }>();
</script>

<template>
  <BaseDialog :open="open" :title="title" @close="emit('close')">
    <div class="confirm">
      <p>{{ message }}</p>
      <p v-for="error in errors ?? []" :key="error" class="notice" role="alert">{{ error }}</p>
      <div class="confirm__actions">
        <button type="button" class="btn btn--secondary" @click="emit('close')">Cancelar</button>
        <button type="button" class="btn btn--danger" :disabled="busy" @click="emit('confirm')">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </BaseDialog>
</template>

<style scoped>
.confirm {
  display: grid;
  gap: var(--s-4);
}

.confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--s-3);
}
</style>
