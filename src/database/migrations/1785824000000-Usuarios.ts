import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backlog 1.1 - Task de BD: crear tabla de usuarios.
 * Ejecutar con: pnpm migration:run
 */
export class Usuarios1785824000000 implements MigrationInterface {
  name = 'Usuarios1785824000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // gen_random_uuid(); en Supabase ya viene habilitada.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE "rol_usuario" AS ENUM (
        'ADMINISTRADOR',
        'DIRECTORA',
        'DOCENTE_PECUARIO',
        'DOCENTE_AGRICOLA',
        'ESTUDIANTE'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id"              uuid         NOT NULL DEFAULT gen_random_uuid(),
        "nombre"          varchar(120) NOT NULL,
        "correo"          varchar(150) NOT NULL,
        "contrasena_hash" varchar(255) NOT NULL,
        "rol"             "rol_usuario" NOT NULL,
        "activo"          boolean      NOT NULL DEFAULT true,
        "ultimo_acceso"   timestamptz,
        "creado_en"       timestamptz  NOT NULL DEFAULT now(),
        "actualizado_en"  timestamptz  NOT NULL DEFAULT now(),
        "creado_por"      uuid,
        "actualizado_por" uuid,
        CONSTRAINT "usuarios_pk" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "usuarios_correo_unico" ON "usuarios" ("correo")`,
    );
    await queryRunner.query(
      `CREATE INDEX "usuarios_activo_idx" ON "usuarios" ("activo")`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "usuarios"."contrasena_hash" IS 'Hash bcrypt cost 12. Nunca almacenar texto plano.'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "usuarios"."activo" IS 'false = desactivado logicamente, no puede iniciar sesion.'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "usuarios_activo_idx"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "usuarios_correo_unico"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "usuarios"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rol_usuario"`);
  }
}
