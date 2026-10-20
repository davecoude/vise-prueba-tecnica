export class HealthStatusDto {
  /** @example ok */
  status!: 'ok';

  /** @example up */
  database!: 'up';

  /** @example 2026-10-19T22:00:00.000Z */
  timestamp!: string;
}
