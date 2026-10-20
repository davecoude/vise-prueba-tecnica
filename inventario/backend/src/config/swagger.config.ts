import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

/**
 * Documentación OpenAPI generada desde el código (DTOs, entidades y decoradores).
 * El plugin de Swagger en nest-cli.json infiere los esquemas a partir de los tipos
 * y de class-validator, evitando duplicar @ApiProperty en cada campo.
 */
export const setupSwagger = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('VISE · API de Inventario')
    .setDescription(
      'Mini sistema de inventario: autenticación JWT, productos, categorías y kardex.\n\n' +
        '1. Ejecuta **POST /api/auth/login** con el usuario semilla.\n' +
        '2. Copia el `accessToken` y pulsa **Authorize**.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: { persistAuthorization: true }, // conserva el token al recargar
    customSiteTitle: 'VISE · API de Inventario',
  });
};
