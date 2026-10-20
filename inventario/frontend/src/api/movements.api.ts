import { request } from './http';
import type { Kardex, Movement, MovementInput } from './types';

export const movementsApi = {
  register: (productId: number, input: MovementInput) =>
    request<Movement>(`/products/${productId}/movements`, { method: 'POST', body: input }),
  kardex: (productId: number, page: number, limit: number) =>
    request<Kardex>(`/products/${productId}/kardex`, { query: { page, limit } }),
};
