import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class LowStockQueryDto {
  // si no se envia, se usa LOW_STOCK_DEFAULT_THRESHOLD del entorno
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  threshold?: number;
}
