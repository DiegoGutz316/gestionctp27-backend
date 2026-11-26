import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tablas del panel QA de usabilidad (sesiones reales con docentes).
 * Solo se usan cuando QA_USABILIDAD_ENABLED=true.
 */
export class QaUsabilidadSesiones1824000000000 implements MigrationInterface {
  name = 'QaUsabilidadSesiones1824000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "qa_usab_participantes" (
        "id" SERIAL PRIMARY KEY,
        "codigo" varchar(40) NOT NULL,
        "rol_perfil" varchar(40) NOT NULL,
        "notas" varchar(250),
        "creado_en" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "qa_usab_participantes_codigo_uq"
      ON "qa_usab_participantes" ("codigo")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "qa_usab_sesiones" (
        "id" SERIAL PRIMARY KEY,
        "participante_id" int NOT NULL REFERENCES "qa_usab_participantes"("id") ON DELETE RESTRICT,
        "prueba_codigo" varchar(20) NOT NULL,
        "fecha_ejecucion" date NOT NULL,
        "hora_inicio" varchar(8),
        "hora_fin" varchar(8),
        "tiempo_minutos" numeric(8,2),
        "resultado" varchar(40),
        "errores" int NOT NULL DEFAULT 0,
        "ayudas" int NOT NULL DEFAULT 0,
        "observaciones" text,
        "estado" varchar(20) NOT NULL DEFAULT 'BORRADOR',
        "origen" varchar(30) NOT NULL DEFAULT 'SESION_REAL',
        "registrado_en" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "registrado_por" uuid NOT NULL,
        "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "actualizado_por" uuid
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "qa_usab_sesiones_prueba_idx"
      ON "qa_usab_sesiones" ("prueba_codigo")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "qa_usab_evidencias" (
        "id" SERIAL PRIMARY KEY,
        "sesion_id" int NOT NULL REFERENCES "qa_usab_sesiones"("id") ON DELETE CASCADE,
        "nombre_archivo" varchar(200) NOT NULL,
        "mime" varchar(120) NOT NULL,
        "tamano_bytes" int NOT NULL,
        "contenido" bytea NOT NULL,
        "subido_en" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "subido_por" uuid NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "qa_usab_historial" (
        "id" SERIAL PRIMARY KEY,
        "sesion_id" int NOT NULL REFERENCES "qa_usab_sesiones"("id") ON DELETE CASCADE,
        "accion" varchar(40) NOT NULL,
        "detalle" jsonb NOT NULL,
        "ocurrido_en" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "actor_id" uuid NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "qa_usab_historial"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "qa_usab_evidencias"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "qa_usab_sesiones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "qa_usab_participantes"`);
  }
}
