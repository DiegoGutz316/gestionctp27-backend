import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Actualiza el enum PostgreSQL `unidad_medida` para coincidir con
 * UnidadMedida en código: Kilogramo, Litro, UNIDAD, Mililitro.
 *
 * GRANEL se migra a Kilogramo (equivalente de granel en peso).
 * El trigger de cambio de unidad se recrea porque TypeORM no lo versiona.
 */
export class ActualizarUnidadMedida1793000000000 implements MigrationInterface {
  name = 'ActualizarUnidadMedida1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_validar_cambio_unidad_producto" ON "productos"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_proteger_movimiento_stock" ON "movimientos_stock"`,
    );

    await queryRunner.query(`
      ALTER TABLE "productos"
      ALTER COLUMN "unidad_medida" TYPE varchar(20)
      USING (
        CASE "unidad_medida"::text
          WHEN 'GRANEL' THEN 'Kilogramo'
          ELSE "unidad_medida"::text
        END
      )
    `);

    await queryRunner.query(`
      UPDATE "movimientos_stock"
      SET "unidad_medida_snapshot" = 'Kilogramo'
      WHERE "unidad_medida_snapshot" = 'GRANEL'
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS "unidad_medida"`);
    await queryRunner.query(
      `CREATE TYPE "unidad_medida" AS ENUM ('Kilogramo', 'Litro', 'UNIDAD', 'Mililitro')`,
    );

    await queryRunner.query(`
      ALTER TABLE "productos"
      ALTER COLUMN "unidad_medida" TYPE "unidad_medida"
      USING "unidad_medida"::"unidad_medida"
    `);

    await this.crearTriggerCambioUnidad(queryRunner);
    await this.crearTriggerMovimientoInmutable(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_validar_cambio_unidad_producto" ON "productos"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_proteger_movimiento_stock" ON "movimientos_stock"`,
    );

    await queryRunner.query(`
      ALTER TABLE "productos"
      ALTER COLUMN "unidad_medida" TYPE varchar(20)
      USING (
        CASE "unidad_medida"::text
          WHEN 'UNIDAD' THEN 'UNIDAD'
          ELSE 'GRANEL'
        END
      )
    `);

    await queryRunner.query(`
      UPDATE "movimientos_stock"
      SET "unidad_medida_snapshot" = 'GRANEL'
      WHERE "unidad_medida_snapshot" IN ('Kilogramo', 'Litro', 'Mililitro')
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS "unidad_medida"`);
    await queryRunner.query(
      `CREATE TYPE "unidad_medida" AS ENUM ('GRANEL', 'UNIDAD')`,
    );

    await queryRunner.query(`
      ALTER TABLE "productos"
      ALTER COLUMN "unidad_medida" TYPE "unidad_medida"
      USING "unidad_medida"::"unidad_medida"
    `);

    await this.crearTriggerCambioUnidad(queryRunner);
    await this.crearTriggerMovimientoInmutable(queryRunner);
  }

  private async crearTriggerCambioUnidad(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE TRIGGER "trg_validar_cambio_unidad_producto"
      BEFORE UPDATE OF "unidad_medida" ON "productos"
      FOR EACH ROW EXECUTE FUNCTION "validar_cambio_unidad_producto"()
    `);
  }

  private async crearTriggerMovimientoInmutable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE TRIGGER "trg_proteger_movimiento_stock"
      BEFORE UPDATE OR DELETE ON "movimientos_stock"
      FOR EACH ROW EXECUTE FUNCTION "rechazar_cambio_inmutable"()
    `);
  }
}
