import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.options';

// fuera de nest cargamos el .env manualmente.
// dotenv no sobrescribe las variables existentes
config({
  path: [join(process.cwd(), '.env.local'), join(process.cwd(), '../../.env')],
  quiet: true,
});

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Variable de entorno faltante: ${key}`);
  return value;
};

export default new DataSource(
  buildTypeOrmOptions({
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 5432),
    username: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  }),
);