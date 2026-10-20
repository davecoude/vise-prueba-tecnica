import { IsString, Length } from 'class-validator';
import { Trim } from '../../../common/decorators/transform.decorators';

export class CreateCategoryDto {
  @Trim()
  @IsString()
  @Length(2, 100)
  name!: string;
}
