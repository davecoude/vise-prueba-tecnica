import { ValueTransformer } from "typeorm";

/**
 * `pg` devuelve NUMERIC como string para no perder precisión.
 * Para precios con 2 decimales, Number es seguro y evita
 * propagar strings por toda la capa de dominio.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => value === null || value === undefined ? value : Number(value),
}