import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bloqueo temporal del login tras varios intentos fallidos.
 *
 * La tabla se indexa por el correo intentado y NO por el id del usuario, ni
 * tiene clave foránea contra `usuarios`, a propósito: así se cuentan también
 * los intentos contra correos que no existen. Si solo se contaran los de
 * cuentas reales, el mensaje de bloqueo aparecería únicamente para correos
 * registrados y serviría para averiguar cuáles lo están.
 */
export class IntentosLogin1793000000000 implements MigrationInterface {
  name = 'IntentosLogin1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "intentos_login" (
        "id"                serial       NOT NULL,
        "correo"            varchar(150) NOT NULL,
        "intentos_fallidos" integer      NOT NULL DEFAULT 0,
        "bloqueado_hasta"   timestamptz,
        "actualizado_en"    timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "intentos_login_pk" PRIMARY KEY ("id"),
        CONSTRAINT "chk_intentos_login_no_negativo" CHECK ("intentos_fallidos" >= 0)
      )
    `);

    // El correo llega siempre normalizado (trim + minúsculas) desde LoginDto,
    // así que el único basta para que el upsert atómico funcione.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "intentos_login_correo_unico" ON "intentos_login" ("correo")`,
    );

    // Para poder purgar registros viejos sin recorrer toda la tabla: un
    // atacante puede crear una fila por cada correo inventado que pruebe.
    await queryRunner.query(
      `CREATE INDEX "intentos_login_actualizado_idx" ON "intentos_login" ("actualizado_en")`,
    );

    await queryRunner.query(
      `COMMENT ON TABLE "intentos_login" IS 'Intentos fallidos de inicio de sesión por correo, exista o no la cuenta. Sin FK a usuarios para no revelar qué correos están registrados.'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "intentos_login"."intentos_fallidos" IS 'Se reinicia a 0 al activarse el bloqueo y al iniciar sesión correctamente.'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "intentos_login_actualizado_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "intentos_login_correo_unico"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "intentos_login"`);
  }
}
