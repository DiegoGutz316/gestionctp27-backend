import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearUsuariosRoles1785723804022 implements MigrationInterface {
  name = 'CrearUsuariosRoles1785723804022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Necesaria para generar identificadores UUID con uuid_generate_v4().
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" SERIAL NOT NULL,
        "nombre" character varying(50) NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_c1433d71a4838793a49dcad46ab"
          PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_roles_nombre"
      ON "roles" ("nombre")
    `);

    // Catálogo inicial de roles.
    await queryRunner.query(`
      INSERT INTO "roles" ("nombre")
      VALUES
        ('Administrador'),
        ('Directora'),
        ('Docente Pecuario'),
        ('Docente Agrícola'),
        ('Estudiante')
    `);

    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" character varying(100) NOT NULL,
        "correo" character varying(150) NOT NULL,
        "contrasena_hash" character varying(255) NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "creado_por" uuid,
        "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "rol_id" integer NOT NULL,
        CONSTRAINT "PK_d7281c63c176e152e4c531594a8"
          PRIMARY KEY ("id")
      )
    `);

    // Evita correos duplicados sin importar mayúsculas y minúsculas.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_usuarios_correo"
      ON "usuarios" (lower("correo"))
    `);

    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD CONSTRAINT "FK_9e519760a660751f4fa21453d3e"
      FOREIGN KEY ("rol_id")
      REFERENCES "roles"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    /*
     * Cuando exista autenticación y un administrador inicial,
     * creado_por podrá convertirse en una llave foránea obligatoria.
     *
     * Por ahora se mantiene nullable para permitir crear el primer usuario.
     */
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP CONSTRAINT "FK_9e519760a660751f4fa21453d3e"
    `);

    await queryRunner.query(`
      DROP INDEX "uq_usuarios_correo"
    `);

    await queryRunner.query(`
      DROP TABLE "usuarios"
    `);

    await queryRunner.query(`
      DROP INDEX "uq_roles_nombre"
    `);

    await queryRunner.query(`
      DROP TABLE "roles"
    `);
  }
}
