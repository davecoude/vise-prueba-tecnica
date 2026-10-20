import { request } from './http';
import type { Category } from './types';

export const categoriesApi = {
  list: () => request<Category[]>('/categories'),
};
