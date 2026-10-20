import type { PaginatedResult } from '../../../common/pagination/paginated-result';
import type { Movement } from '../entities/movement.entity';

export interface KardexProductSummary {
  id: number;
  sku: string;
  name: string;
  currentStock: number;
}

// historial paginado de movimientos + resumen del producto
export interface KardexResult extends PaginatedResult<Movement> {
  product: KardexProductSummary;
}
