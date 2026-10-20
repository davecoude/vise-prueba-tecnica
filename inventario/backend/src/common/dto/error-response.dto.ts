import { ApiProperty } from '@nestjs/swagger';

/** Formato estándar de error de la API (el mismo que produce Nest y el filtro de BD). */
export class ErrorResponseDto {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Stock insuficiente para PAP-002: disponible 3, solicitado 5',
    description:
      'Mensaje o lista de mensajes (los errores de validación devuelven una lista)',
  })
  message!: string | string[];

  @ApiProperty({ example: 'Conflict' })
  error!: string;
}
