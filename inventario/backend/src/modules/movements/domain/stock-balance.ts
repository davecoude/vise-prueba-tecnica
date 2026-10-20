import { MovementType } from '../entities/movement.entity';

/**
 * Regla de dominio pura (sin BD ni HTTP): saldo resultante tras aplicar un movimiento.
 * Puede devolver un número negativo; decidir si es válido es responsabilidad del servicio.
 */
export const calculateBalanceAfter = (
  currentStock: number,
  type: MovementType,
  quantity: number,
): number =>
  type === MovementType.ENTRADA
    ? currentStock + quantity
    : currentStock - quantity;
