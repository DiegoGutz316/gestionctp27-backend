import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Unidad de medida de la cantidad cosechada (kilos o unidades).
 *
 * Hasta ahora "12.5" no decia de que: los kilos y las unidades convivian en la
 * misma columna sin distinguirse.
 *
 * La marca va despues de 1806000000000-CrearCosechas, la ultima aplicada.
 */
export class UnidadMedidaCosechas1807000000000 implements MigrationInterface {
  name = 'UnidadMedidaCosechas1807000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // El DEFAULT es solo para rellenar lo que ya existe: todas las cosechas
    // registradas hasta hoy tienen decimales y se pesaron en kilos.
    await queryRunner.query(`
      ALTER TABLE "cosechas"
      ADD COLUMN "unidad_medida" varchar(20) NOT NULL DEFAULT 'KG'
    `);

    // Y se quita enseguida: dar por supuesta una unidad es justo el error que
    // esta columna viene a evitar. Quien inserte una cosecha tiene que decir
    // en que la midio.
    await queryRunner.query(`
      ALTER TABLE "cosechas"
      ALTER COLUMN "unidad_medida" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "cosechas"
      ADD CONSTRAINT "cosechas_unidad_medida_check"
      CHECK ("unidad_medida" IN ('KG', 'UNIDADES'))
    `);

    // "Si el usuario selecciona unidad solo puede poner numeros enteros":
    // tambien en la base, no solo en el DTO, para que ningun otro camino
    // pueda saltarselo. Mismo criterio que el CHECK de cantidad positiva.
    await queryRunner.query(`
      ALTER TABLE "cosechas"
      ADD CONSTRAINT "cosechas_cantidad_entera_check"
      CHECK (
        "unidad_medida" <> 'UNIDADES'
        OR "cantidad_obtenida" = trunc("cantidad_obtenida")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cosechas"
      DROP CONSTRAINT IF EXISTS "cosechas_cantidad_entera_check"
    `);

    await queryRunner.query(`
      ALTER TABLE "cosechas"
      DROP CONSTRAINT IF EXISTS "cosechas_unidad_medida_check"
    `);

    await queryRunner.query(`
      ALTER TABLE "cosechas"
      DROP COLUMN IF EXISTS "unidad_medida"
    `);
  }
}
