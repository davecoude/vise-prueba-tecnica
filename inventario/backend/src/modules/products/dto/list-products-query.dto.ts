import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Trim } from '../../../common/decorators/transform.decorators';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  // busqueda parcial por nombre o SKU (case-insensitive)
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;
}