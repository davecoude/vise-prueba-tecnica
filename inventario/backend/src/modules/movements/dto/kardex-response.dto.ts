import { PaginationMetaDto } from '../../../common/pagination/pagination-meta.dto';
import { Movement } from '../entities/movement.entity';
import type {
  KardexProductSummary,
  KardexResult,
} from '../interfaces/kardex.interfaces';

export class KardexProductSummaryDto implements KardexProductSummary {
  /** @example 5 */
  id!: number;

  /** @example PAP-002 */
  sku!: string;

  /** @example Caja de bolígrafos x12 */
  name!: string;

  /** Stock actual; coincide con el balanceAfter del último movimiento. @example 8 */
  currentStock!: number;
}

export class KardexResponseDto implements KardexResult {
  product!: KardexProductSummaryDto;
  data!: Movement[];
  meta!: PaginationMetaDto;
}
