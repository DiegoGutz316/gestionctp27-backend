import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tipo y unidad del tratamiento. En esta base las columnas ya existen
 * (migración aplicada fuera de este árbol); el IF NOT EXISTS deja el alta
 * registrada sin volver a crearlas, y un entorno nuevo sí las obtiene.
 */
export class AsegurarTipoYUnidadTratamiento1811000000000
  implements MigrationInterface
{
  name = 'AsegurarTipoYUnidadTratamiento1811000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      ADD COLUMN IF NOT EXISTS "tipo" varchar(40)
    `);

    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      ADD COLUMN IF NOT EXISTS "unidad" varchar(20)
    `);

    await queryRunner.query(`
      UPDATE "tratamientos_agricolas"
      SET "tipo" = 'OTRO'
      WHERE "tipo" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "tratamientos_agricolas"
      SET "unidad" = 'KG'
      WHERE "unidad" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      ALTER COLUMN "tipo" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      ALTER COLUMN "unidad" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      DROP COLUMN IF EXISTS "unidad"
    `);

    await queryRunner.query(`
      ALTER TABLE "tratamientos_agricolas"
      DROP COLUMN IF EXISTS "tipo"
    `);
  }
}
