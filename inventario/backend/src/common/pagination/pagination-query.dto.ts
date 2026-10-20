import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

// los query params llegan como string: @Type los convierte antes de validar
export class PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // tope de 100 para que un cliente no pida la tabla completa en una sola página
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
