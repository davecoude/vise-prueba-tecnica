<script setup lang="ts">
import { computed } from 'vue';
import type { Movement } from '@/api/types';
import { formatDateTime, formatNumber } from '@/utils/format';

/**
 * Kardex como libro mayor: cada fila muestra el saldo y una barra de nivel que
 * dibuja cuánto subió (entrada) o bajó (salida) el stock en ese movimiento.
 */
const props = defineProps<{ movements: Movement[]; highlightId?: number | null }>();

interface LedgerRow {
  movement: Movement;
  previous: number;
  /** Porcentajes del ancho de la barra. */
  base: number;
  delta: number;
}

const rows = computed<LedgerRow[]>(() => {
  const withPrevious = props.movements.map((movement) => ({
    movement,
    previous: movement.balanceAfter + (movement.type === 'entrada' ? -movement.quantity : movement.quantity),
  }));
  const scale = Math.max(1, ...withPrevious.map((r) => Math.max(r.previous, r.movement.balanceAfter)));

  return withPrevious.map(({ movement, previous }) => {
    const low = Math.min(previous, movement.balanceAfter);
    return {
      movement,
      previous,
      base: (low / scale) * 100,
      delta: (movement.quantity / scale) * 100,
    };
  });
});
</script>

<template>
  <div class="ledger-wrap">
    <table class="ledger">
      <caption class="visually-hidden">
        Historial de movimientos con saldo acumulado
      </caption>
      <thead>
        <tr>
          <th scope="col">Fecha</th>
          <th scope="col" class="ledger__optional">Movimiento</th>
          <th scope="col" class="ledger__qty">Cantidad</th>
          <th scope="col" class="ledger__balance">Saldo</th>
          <th scope="col" class="ledger__optional">Nota</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.movement.id"
          :class="['ledger__row', `ledger__row--${row.movement.type}`, { 'ledger__row--new': row.movement.id === highlightId }]"
        >
          <td class="ledger__date num">{{ formatDateTime(row.movement.date) }}</td>
          <td class="ledger__optional">{{ row.movement.type === 'entrada' ? 'Entrada' : 'Salida' }}</td>
          <td class="ledger__qty num">
            {{ row.movement.type === 'entrada' ? '+' : '−' }}{{ formatNumber(row.movement.quantity) }}
          </td>
          <td class="ledger__balance">
            <div class="level">
              <span class="level__value num">{{ formatNumber(row.movement.balanceAfter) }}</span>
              <span
                class="level__track"
                role="img"
                :aria-label="`De ${formatNumber(row.previous)} a ${formatNumber(row.movement.balanceAfter)} unidades`"
              >
                <span class="level__base" :style="{ width: `${row.base}%` }" />
                <span class="level__delta" :style="{ width: `${row.delta}%` }" />
              </span>
            </div>
          </td>
          <td class="ledger__note ledger__optional">{{ row.movement.note ?? '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.ledger-wrap {
  overflow-x: auto;
  border-radius: var(--r-panel);
  border: 1px solid var(--linea-suave);
  background: var(--superficie);
}

.ledger {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: var(--t-sm);
}

.ledger th {
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--linea);
  color: var(--liquen);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.ledger td {
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--linea-suave);
  vertical-align: middle;
}

.ledger tbody tr:last-child td {
  border-bottom: 0;
}

.ledger__date {
  white-space: nowrap;
  color: var(--liquen);
}

.ledger__qty,
.ledger th.ledger__qty {
  text-align: right;
  font-weight: 700;
  white-space: nowrap;
}

.ledger__row--entrada .ledger__qty {
  color: var(--hoja);
}

.ledger__row--salida .ledger__qty {
  color: var(--indigo);
}

.ledger__balance {
  width: 34%;
}

.ledger__note {
  color: var(--liquen);
}

/* Barra de nivel: base (stock que se mantiene) + delta (lo que entró o salió) */
.level {
  display: grid;
  grid-template-columns: 3.5rem 1fr;
  align-items: center;
  gap: var(--s-3);
}

.level__value {
  font-weight: 700;
  font-size: var(--t-md);
  text-align: right;
}

.level__track {
  display: flex;
  height: 10px;
  background: var(--niebla);
  border-radius: 2px;
  overflow: hidden;
}

.level__base {
  background: #9fb3a5;
}

.ledger__row--entrada .level__delta {
  background: var(--hoja);
}

/* En una salida, el tramo "retirado" se dibuja rayado: ya no está en el stock */
.ledger__row--salida .level__delta {
  background: repeating-linear-gradient(
    -45deg,
    var(--indigo) 0 2px,
    transparent 2px 5px
  );
  box-shadow: inset 0 0 0 1px var(--indigo);
}

/* En móvil: fecha, cantidad con signo y saldo (el signo +/− indica el tipo) */
@media (max-width: 640px) {
  .ledger {
    min-width: 0;
  }

  .ledger__optional {
    display: none;
  }

  .ledger th,
  .ledger td {
    padding: var(--s-3);
  }

  .ledger__date {
    white-space: normal;
  }

  .level {
    grid-template-columns: 2.5rem 1fr;
  }
}

/* Respuesta a la acción del usuario: el movimiento recién registrado se resalta un instante */
.ledger__row--new td {
  animation: highlight 1.8s ease-out;
}

@keyframes highlight {
  from {
    background: var(--hoja-fondo);
  }
  to {
    background: transparent;
  }
}
</style>
