import { MovementType } from '../entities/movement.entity';
import { calculateBalanceAfter } from './stock-balance';

describe('calculateBalanceAfter', () => {
  it.each([
    { stock: 10, type: MovementType.ENTRADA, qty: 5, expected: 15 },
    { stock: 0, type: MovementType.ENTRADA, qty: 1, expected: 1 },
    { stock: 10, type: MovementType.SALIDA, qty: 4, expected: 6 },
    { stock: 10, type: MovementType.SALIDA, qty: 10, expected: 0 },
    { stock: 3, type: MovementType.SALIDA, qty: 5, expected: -2 },
  ])(
    '$type de $qty sobre stock $stock → $expected',
    ({ stock, type, qty, expected }) => {
      expect(calculateBalanceAfter(stock, type, qty)).toBe(expected);
    },
  );
});
