import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El codigo del animal deja de distinguir mayusculas: `qa-bov-01` y
 * `QA-BOV-01` son el mismo animal. El servicio ya lo comprueba, pero sin un
 * indice que lo respalde dos POST simultaneos aun podrian crear ambos.
 *
 * Reemplaza `animales_codigo_unico` (sobre `codigo`) por uno sobre
 * `lower(codigo)`. Si ya hay codigos que solo difieren en mayusculas la
 * migracion se detiene con la lista, en lugar de borrar o renombrar datos:
 * hay que decidir a mano cual conservar.
 *
 * El indice nuevo es de expresion y TypeORM no lo modela con decoradores; la
 * entidad lo declara con `synchronize: false` para que `migration:generate` no
 * intente recrearlo.
 */
export class CodigoAnimalSinDistinguirMayusculas1821000000000 implements MigrationInterface {
  name = 'CodigoAnimalSinDistinguirMayusculas1821000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicados: { codigos: string }[] = await queryRunner.query(`
      SELECT string_agg("codigo", ', ' ORDER BY "codigo") AS "codigos"
      FROM "animales"
      GROUP BY lower("codigo")
      HAVING count(*) > 1
    `);

    if (duplicados.length > 0) {
      const detalle = duplicados.map((fila) => `[${fila.codigos}]`).join(' ');

      throw new Error(
        `Hay codigos de animal que solo difieren en mayusculas: ${detalle}. ` +
          'Corrijalos antes de ejecutar esta migracion.',
      );
    }

    await queryRunner.query(`
      DROP INDEX IF EXISTS "animales_codigo_unico"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "animales_codigo_unico_ci"
      ON "animales" (lower("codigo"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "animales_codigo_unico_ci"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "animales_codigo_unico"
      ON "animales" ("codigo")
    `);
  }
}
