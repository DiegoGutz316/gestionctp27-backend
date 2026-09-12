import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Continuacion de NormalizarEspecieYEstadoAnimales.
 *
 * Al pasar los bovinos a la especie VACA quedaron sin `categoria_bovina`, que
 * el DTO exige para esa especie: los animales existentes seguian sin poder
 * editarse, ahora por ese campo.
 *
 * Se les asigna VACA (hembra adulta) porque los registros afectados eran de
 * prueba y no habia forma de deducir la categoria real. Si mas adelante entran
 * datos reales, la categoria hay que capturarla al registrar el animal, no
 * rellenarla aqui.
 */
export class CategoriaBovinaDeAnimalesExistentes1801000000000 implements MigrationInterface {
  name = 'CategoriaBovinaDeAnimalesExistentes1801000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "animales"
      SET "categoria_bovina" = 'VACA'
      WHERE "especie" = 'VACA'
        AND "categoria_bovina" IS NULL
    `);

    // La categoria solo aplica a bovinos; en el resto debe quedar vacia.
    await queryRunner.query(`
      UPDATE "animales"
      SET "categoria_bovina" = NULL
      WHERE "especie" <> 'VACA'
        AND "categoria_bovina" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "animales"
      SET "categoria_bovina" = NULL
      WHERE "especie" = 'VACA'
    `);
  }
}
