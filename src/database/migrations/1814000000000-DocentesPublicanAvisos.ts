import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backlog 5.5: "Como docente o administrador autorizado, quiero publicar
 * avisos institucionales".
 *
 * Los docentes tenian LECTURA sobre REPORTES, asi que publicar un aviso les
 * respondia 403 y solo el administrador podia hacerlo, en contra de la
 * historia de usuario.
 *
 * Subirlos a COMPLETO no les abre ningun reporte nuevo: los tres reportes y
 * las exportaciones piden LECTURA, que ya tenian. Lo unico que cambia es que
 * ahora pueden publicar avisos, que es lo que el backlog pide.
 *
 * La directora se deja como estaba: la historia nombra a docentes y
 * administrador, y ampliar mas el permiso es una decision del equipo.
 */
export class DocentesPublicanAvisos1814000000000 implements MigrationInterface {
  name = 'DocentesPublicanAvisos1814000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "permisos_rol"
      SET "nivel" = 'COMPLETO', "actualizado_en" = now()
      WHERE "modulo"::text = 'REPORTES'
        AND "rol"::text IN ('DOCENTE_PECUARIO', 'DOCENTE_AGRICOLA')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "permisos_rol"
      SET "nivel" = 'LECTURA', "actualizado_en" = now()
      WHERE "modulo"::text = 'REPORTES'
        AND "rol"::text IN ('DOCENTE_PECUARIO', 'DOCENTE_AGRICOLA')
    `);
  }
}
