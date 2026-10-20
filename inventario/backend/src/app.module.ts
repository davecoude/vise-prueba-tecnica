import { APP_PIPE, APP_FILTER } from '@nestjs/core';
import { QueryFailedExceptionFilter } from './common/filters/query-failed-exception.filter';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { MovementsModule } from './modules/movements/movements.module';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './config/env.validation';
import { buildTypeOrmOptions } from './database/typeorm.options';
import { AuthModule } from './modules/auth/auth.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '../../.env'],
      validationSchema: envValidationSchema,
      // @nestjs/config v12 valida vía Standard Schema y para Joi ya aplica
      // { abortEarly: false, allowUnknown: true } por defecto → reporta TODOS los errores
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildTypeOrmOptions({
          host: config.getOrThrow<string>('DB_HOST'),
          port: config.getOrThrow<number>('DB_PORT'),
          username: config.getOrThrow<string>('DB_USER'),
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.getOrThrow<string>('DB_NAME'),
        }),

        // aplica migraciones pendientes al arrancar -> docker composer up
        migrationsRun: true,
      }),
    }),
    AuthModule,
    CategoriesModule,
    ProductsModule,
    MovementsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      //validacion global via DI
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true, // responde 400 si llegan
        transform: true, // ejecuta @Transform y convierte a instancias del DTO
      }),
    },
    {
      // filtro global: traduce errores de PostgreSQL a respuestas HTTP
      provide: APP_FILTER,
      useClass: QueryFailedExceptionFilter,
    },
  ],
})
export class AppModule {}
