import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// todos los campos opcionales; hereda validaciones y transformaciones del CreateDto
export class UpdateProductDto extends PartialType(CreateProductDto) {}