import { MigrationInterface, QueryRunner } from 'typeorm';

export class MotivoFinalizacionSiembra1809000000000
  implements MigrationInterface
{
  name = 'MotivoFinalizacionSiembra1809000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "siembras"
      ADD COLUMN "motivo_finalizacion" varchar(40),
      ADD COLUMN "motivo_detalle" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "siembras"
      DROP COLUMN "motivo_detalle",
      DROP COLUMN "motivo_finalizacion"
    `);
  }
}
