import type { PaginationMeta } from './paginated-result';

/** Representación documentable (Swagger) de los metadatos de paginación. */
export class PaginationMetaDto implements PaginationMeta {
  /** @example 1 */
  page!: number;

  /** @example 10 */
  limit!: number;

  /** @example 42 */
  total!: number;

  /** @example 5 */
  totalPages!: number;
}
