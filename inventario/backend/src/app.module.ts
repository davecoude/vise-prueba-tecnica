import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './config/env.validation';
import { buildTypeOrmOptions } from './database/typeorm.options';

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
  ],
})
export class AppModule {}