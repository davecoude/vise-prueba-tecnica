import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/decorators/transform.decorators';
import { MovementType } from '../entities/movement.entity';

export class CreateMovementDto {
  @IsEnum(MovementType, { message: 'type debe ser "entrada" o "salida"' })
  type!: MovementType;

  // tope razonable: evita desbordar INTEGER (2.147.483.647) al sumar al stock
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity!: number;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  note?: string;
}
