<script setup lang="ts">
import { useNotificationsStore } from '@/stores/notifications';

const notifications = useNotificationsStore();
</script>

<template>
  <!-- aria-live: los lectores de pantalla anuncian cada confirmación -->
  <div class="toasts" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <p v-for="item in notifications.items" :key="item.id" class="toast">
        {{ item.message }}
      </p>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: var(--s-4);
  bottom: var(--s-4);
  z-index: 50;
  display: grid;
  gap: var(--s-2);
}

.toast {
  padding: var(--s-3) var(--s-4);
  border-radius: var(--r-control);
  background: var(--tinta);
  color: #fff;
  font-size: var(--t-sm);
  font-weight: 600;
  box-shadow: 0 6px 20px rgb(24 36 28 / 0.25);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
