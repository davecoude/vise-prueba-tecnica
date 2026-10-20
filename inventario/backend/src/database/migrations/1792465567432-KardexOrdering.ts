import { MigrationInterface, QueryRunner } from 'typeorm';

export class KardexOrdering1792465567432 implements MigrationInterface {
  name = 'KardexOrdering1792465567432';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_movements_product_date"`);
    await queryRunner.query(
      `ALTER TABLE "movements" ALTER COLUMN "date" SET DEFAULT clock_timestamp()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_movements_product_id_id" ON "movements"  ("product_id", "id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_movements_product_id_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movements" ALTER COLUMN "date" SET DEFAULT now()`,
    );
    await queryRunner.query(
      // Corregido a mano: TypeORM introspecta las columnas del índice en orden de tabla
      // (id, product_id, date) en vez del orden real del índice original.
      `CREATE INDEX "IDX_movements_product_date" ON "movements" ("product_id", "date", "id") `,
    );
  }
}
