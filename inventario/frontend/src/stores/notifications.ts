import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Notification {
  id: number;
  message: string;
}

/** Confirmaciones breves de acciones completadas ("Producto creado", "Salida registrada"). */
export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([]);
  let nextId = 1;

  function notify(message: string, durationMs = 3500): void {
    const id = nextId++;
    items.value.push({ id, message });
    window.setTimeout(() => dismiss(id), durationMs);
  }

  function dismiss(id: number): void {
    items.value = items.value.filter((item) => item.id !== id);
  }

  return { items, notify, dismiss };
});
