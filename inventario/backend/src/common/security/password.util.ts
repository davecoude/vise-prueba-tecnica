import { compare, hash, hashSync } from 'bcryptjs';

export const BCRYPT_SALT_ROUNDS = 10;

/**
 * Hash señuelo para mitigar timing attacks en el login:
 * si el usuario no existe, igual se ejecuta un compare de costo equivalente.
 * Se calcula una sola vez al cargar el módulo.
 */
export const DUMMY_PASSWORD_HASH = hashSync(
  'timing-attack-mitigation',
  BCRYPT_SALT_ROUNDS,
);
export const hashPassword = (plain: string): Promise<string> =>
  hash(plain, BCRYPT_SALT_ROUNDS);
export const verifyPassword = (
  plain: string,
  hashed: string,
): Promise<boolean> => compare(plain, hashed);
