import { MigrationInterface, QueryRunner } from 'typeorm';

export class EstadosSiembraCamas1804000000000 implements MigrationInterface {
  name = 'EstadosSiembraCamas1804000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "camas_cultivo"
      SET "estado" = 'SEMBRADA'
      WHERE "estado" = 'EN_USO'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "camas_cultivo"
      SET "estado" = 'EN_USO'
      WHERE "estado" = 'SEMBRADA'
    `);
  }
}
