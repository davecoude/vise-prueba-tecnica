import { request } from './http';
import type { LowStockResult, Paginated, Product, ProductInput, ProductListQuery } from './types';

export const productsApi = {
  list: (query: ProductListQuery) => request<Paginated<Product>>('/products', { query: { ...query } }),
  lowStock: (threshold?: number) => request<LowStockResult>('/products/low-stock', { query: { threshold } }),
  get: (id: number) => request<Product>(`/products/${id}`),
  create: (input: ProductInput) => request<Product>('/products', { method: 'POST', body: input }),
  update: (id: number, input: Partial<ProductInput>) =>
    request<Product>(`/products/${id}`, { method: 'PATCH', body: input }),
  remove: (id: number) => request<void>(`/products/${id}`, { method: 'DELETE' }),
};
