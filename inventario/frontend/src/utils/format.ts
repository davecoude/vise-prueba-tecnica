const price = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const integer = new Intl.NumberFormat('es-CO');
const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export const formatPrice = (value: number): string => price.format(value);
export const formatNumber = (value: number): string => integer.format(value);
export const formatUnits = (value: number): string =>
  `${integer.format(value)} ${value === 1 ? 'unidad' : 'unidades'}`;
export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));
