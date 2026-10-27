import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tokens de un solo uso para restablecer contraseña desde el login.
 * Se guarda el hash del token, nunca el valor en claro.
 */
export class TokensRestablecerContrasena1822000000000
  implements MigrationInterface
{
  name = 'TokensRestablecerContrasena1822000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tokens_restablecer_contrasena" (
        "id"          uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id"  uuid         NOT NULL,
        "token_hash"  varchar(64)  NOT NULL,
        "expira_en"   timestamptz  NOT NULL,
        "usado_en"    timestamptz,
        "creado_en"   timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "tokens_restablecer_contrasena_pk" PRIMARY KEY ("id"),
        CONSTRAINT "uq_tokens_restablecer_hash" UNIQUE ("token_hash"),
        CONSTRAINT "fk_tokens_restablecer_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "tokens_restablecer_usuario_idx"
      ON "tokens_restablecer_contrasena" ("usuario_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "tokens_restablecer_usuario_idx"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "tokens_restablecer_contrasena"`,
    );
  }
}
