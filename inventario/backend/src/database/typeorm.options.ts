import { DataSourceOptions } from 'typeorm';

export interface DbConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * Única fuente de verdad de la configuración de TypeORM.
 * Función pura: la consumen Nest (vía ConfigService) y la CLI (vía process.env).
 * Los globs cubren .ts (ts-node) y .js (dist compilado).
 */
export const buildTypeOrmOptions = (
  db: DbConnectionConfig,
): DataSourceOptions => ({
  type: 'postgres',
  ...db,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});
