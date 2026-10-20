import { Transform } from 'class-transformer';

// elimina espacios al inicio y al final si el valor es un string
export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

// trim + mayusculas (codigos como el SKU)
export const TrimUpper = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );
