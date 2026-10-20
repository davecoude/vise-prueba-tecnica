import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Preferencias de la sesión de inventario compartidas entre vistas.
 * El umbral arranca en 10 (valor por defecto de la API) y se actualiza con
 * el que devuelve GET /products/low-stock.
 */
export const useInventoryStore = defineStore('inventory', () => {
  const lowStockThreshold = ref(10);
  return { lowStockThreshold };
});
