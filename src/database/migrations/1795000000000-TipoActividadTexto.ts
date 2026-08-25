import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El tipo de actividad del departamento de caja pasa de enum fijo a texto libre.
 */
export class TipoActividadTexto1795000000000 implements MigrationInterface {
  name = 'TipoActividadTexto1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "departamentos_caja"
      ALTER COLUMN "tipo_actividad" TYPE varchar(120)
      USING "tipo_actividad"::text
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_actividad_caja"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "tipo_actividad_caja" AS ENUM (
        'AGRICOLA',
        'PECUARIA',
        'AGROINDUSTRIAL',
        'COMERCIAL',
        'SERVICIOS',
        'GENERAL'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "departamentos_caja"
      ALTER COLUMN "tipo_actividad" TYPE "tipo_actividad_caja"
      USING (
        CASE "tipo_actividad"
          WHEN 'AGRICOLA' THEN 'AGRICOLA'::tipo_actividad_caja
          WHEN 'PECUARIA' THEN 'PECUARIA'::tipo_actividad_caja
          WHEN 'AGROINDUSTRIAL' THEN 'AGROINDUSTRIAL'::tipo_actividad_caja
          WHEN 'COMERCIAL' THEN 'COMERCIAL'::tipo_actividad_caja
          WHEN 'SERVICIOS' THEN 'SERVICIOS'::tipo_actividad_caja
          ELSE 'GENERAL'::tipo_actividad_caja
        END
      )
    `);
  }
}
