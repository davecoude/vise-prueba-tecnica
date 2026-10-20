/** Contratos de la API (espejo de los DTOs del backend). */

export type MovementType = 'entrada' | 'salida';

export interface Category {
  id: number;
  name: string;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  category?: Category;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface LowStockResult {
  threshold: number;
  total: number;
  data: Product[];
}

export interface Movement {
  id: number;
  productId: number;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  note: string | null;
  date: string;
}

export interface Kardex extends Paginated<Movement> {
  product: { id: number; sku: string; name: string; currentStock: number };
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface ProductInput {
  name: string;
  sku: string;
  categoryId: number;
  price: number;
}

export interface MovementInput {
  type: MovementType;
  quantity: number;
  note?: string;
}

export interface ProductListQuery {
  page?: number;
  limit?: number;
  categoryId?: number;
  search?: string;
}
