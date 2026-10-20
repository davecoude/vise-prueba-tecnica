import { PaginationMetaDto } from '../../../common/pagination/pagination-meta.dto';
import type { PaginatedResult } from '../../../common/pagination/paginated-result';
import { Product } from '../entities/product.entity';
import type { LowStockResult } from '../products.service';

/** Esquemas de respuesta para Swagger (los genéricos de TS no existen en tiempo de ejecución). */
export class PaginatedProductsResponseDto implements PaginatedResult<Product> {
  data!: Product[];
  meta!: PaginationMetaDto;
}

export class LowStockResponseDto implements LowStockResult {
  /** Umbral aplicado (stock estrictamente menor). @example 10 */
  threshold!: number;

  /** @example 4 */
  total!: number;

  data!: Product[];
}
