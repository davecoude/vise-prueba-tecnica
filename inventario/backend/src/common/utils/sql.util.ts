/**
 * Escapa los comodines de LIKE/ILIKE (%, _) y el caracter de escape (\).
 * Evita que una busqueda como "%" devuelva toda la tabla (wildcard injection).
 */
export const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, '\\$&');
