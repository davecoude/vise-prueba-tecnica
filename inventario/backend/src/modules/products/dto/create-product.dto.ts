import {
  IsInt,
  IsNumber,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  Trim,
  TrimUpper,
} from '../../../common/decorators/transform.decorators';

/**
 * Sin `stock`: el stock solo cambia mediante movimientos (kardex).
 * Si el cliente lo envia, forbidNonWhitelisted responde 400.
 */
export class CreateProductDto {
  @Trim()
  @IsString()
  @Length(2, 150)
  name!: string;

  @TrimUpper()
  @IsString()
  @Matches(/^[A-Z0-9-]{3,50}$/, {
    message:
      'sku debe tener entre 3 y 50 caracteres: letras, números o guiones',
  })
  sku!: string;

  @IsInt()
  @Min(1)
  categoryId!: number;

  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9_999_999_999.99) // limite de NUMERIC(12,2)
  price!: number;
}
