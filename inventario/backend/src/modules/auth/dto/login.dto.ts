import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  // normaliza para que coincida con el email guardado en minusculas
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email debe ser un correo válido' })
  @MaxLength(150)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'password es obligatorio' })
  // bcrypt solo considera los primeros 72 bytes
  @MaxLength(72)
  password!: string;
}