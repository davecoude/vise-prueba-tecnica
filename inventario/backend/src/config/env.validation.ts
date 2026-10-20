import * as Joi from 'joi';

/**
 * Contrato de variables de entorno. Si algo falta o es inválido,
 * la aplicación no arranca (fail fast) y reporta todos los errores.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  JWT_SECRET: Joi.string().min(23).required(),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('1h'),

  // +32 caracteres: uno corto es vulnerable a fuerza bruta
  LOW_STOCK_DEFAULT_THRESHOLD: Joi.number().integer().min(0).default(10),

  // solo los usa el script de seed
  SEED_USER_EMAIL: Joi.string().email().optional(),
  SEED_USER_PASSWORD: Joi.string().min(8).optional(),
});
