import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

// Los query params llegan como string: @Type los convierte antes de validar
export class PaginationQueryDto {
  // Opcional para el cliente (tiene valor por defecto), siempre definido para el servicio
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // Tope de 100 para que un cliente no pida la tabla completa en una sola página
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
