import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backlog 1.6 (Asignar roles y permisos) - Tasks de BD:
 *  - "Crear tabla de permisos si se requiere mayor detalle" -> permisos_rol.
 *  - "Registrar fecha de asignacion o modificacion del rol" -> usuarios.rol_asignado_en.
 *
 * El rol se mantiene como enum en usuarios.rol (los 5 roles son fijos y no los
 * administra el usuario final). Lo que se lleva a BD es la matriz de permisos,
 * para poder ajustar el acceso de cada rol sin recompilar.
 *
 * La matriz sembrada se deriva de las historias de usuario de cada Feature:
 *  - Feature 1 (usuarios): "Solo el administrador...".
 *  - Feature 2/3: cada docente administra su area; la otra area no le compete.
 *  - Feature 4 (inventario): ambos docentes registran entradas/salidas.
 *  - Feature 5 (reportes): "docente pecuario, administradora o directora".
 *  - Feature 6 (panel): "Todo usuario autenticado puede acceder".
 */
export class PermisosRol1786700000000 implements MigrationInterface {
  name = 'PermisosRol1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "modulo_sistema" AS ENUM (
        'PANEL',
        'USUARIOS',
        'PECUARIA',
        'AGRICOLA',
        'INVENTARIO',
        'REPORTES'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "nivel_permiso" AS ENUM (
        'NINGUNO',
        'LECTURA',
        'COMPLETO'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "permisos_rol" (
        "id"             serial          NOT NULL,
        "rol"            "rol_usuario"   NOT NULL,
        "modulo"         "modulo_sistema" NOT NULL,
        "nivel"          "nivel_permiso" NOT NULL DEFAULT 'NINGUNO',
        "creado_en"      timestamptz     NOT NULL DEFAULT now(),
        "actualizado_en" timestamptz     NOT NULL DEFAULT now(),
        CONSTRAINT "permisos_rol_pk" PRIMARY KEY ("id")
      )
    `);

    // Un solo nivel por combinacion rol+modulo.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "permisos_rol_unico" ON "permisos_rol" ("rol", "modulo")`,
    );

    await queryRunner.query(
      `COMMENT ON TABLE "permisos_rol" IS 'Backlog 1.6: matriz de permisos por rol. Editable sin desplegar; la API la relee al invalidar su cache.'`,
    );

    // Matriz completa (5 roles x 6 modulos). Se siembran tambien los NINGUNO
    // para que la matriz quede explicita y facil de editar desde la BD.
    await queryRunner.query(`
      INSERT INTO "permisos_rol" ("rol", "modulo", "nivel") VALUES
        -- Administrador: control total del sistema.
        ('ADMINISTRADOR',   'PANEL',      'COMPLETO'),
        ('ADMINISTRADOR',   'USUARIOS',   'COMPLETO'),
        ('ADMINISTRADOR',   'PECUARIA',   'COMPLETO'),
        ('ADMINISTRADOR',   'AGRICOLA',   'COMPLETO'),
        ('ADMINISTRADOR',   'INVENTARIO', 'COMPLETO'),
        ('ADMINISTRADOR',   'REPORTES',   'COMPLETO'),

        -- Directora: supervision. Ve todo en lectura, no administra usuarios.
        ('DIRECTORA',       'PANEL',      'LECTURA'),
        ('DIRECTORA',       'USUARIOS',   'NINGUNO'),
        ('DIRECTORA',       'PECUARIA',   'LECTURA'),
        ('DIRECTORA',       'AGRICOLA',   'LECTURA'),
        ('DIRECTORA',       'INVENTARIO', 'LECTURA'),
        ('DIRECTORA',       'REPORTES',   'LECTURA'),

        -- Docente pecuario: administra su area y el inventario que consume.
        ('DOCENTE_PECUARIO','PANEL',      'LECTURA'),
        ('DOCENTE_PECUARIO','USUARIOS',   'NINGUNO'),
        ('DOCENTE_PECUARIO','PECUARIA',   'COMPLETO'),
        ('DOCENTE_PECUARIO','AGRICOLA',   'NINGUNO'),
        ('DOCENTE_PECUARIO','INVENTARIO', 'COMPLETO'),
        ('DOCENTE_PECUARIO','REPORTES',   'LECTURA'),

        -- Docente agricola: simetrico al pecuario.
        ('DOCENTE_AGRICOLA','PANEL',      'LECTURA'),
        ('DOCENTE_AGRICOLA','USUARIOS',   'NINGUNO'),
        ('DOCENTE_AGRICOLA','PECUARIA',   'NINGUNO'),
        ('DOCENTE_AGRICOLA','AGRICOLA',   'COMPLETO'),
        ('DOCENTE_AGRICOLA','INVENTARIO', 'COMPLETO'),
        ('DOCENTE_AGRICOLA','REPORTES',   'LECTURA'),

        -- Estudiante: solo consulta; no genera reportes ni administra.
        ('ESTUDIANTE',      'PANEL',      'LECTURA'),
        ('ESTUDIANTE',      'USUARIOS',   'NINGUNO'),
        ('ESTUDIANTE',      'PECUARIA',   'LECTURA'),
        ('ESTUDIANTE',      'AGRICOLA',   'LECTURA'),
        ('ESTUDIANTE',      'INVENTARIO', 'LECTURA'),
        ('ESTUDIANTE',      'REPORTES',   'NINGUNO')
    `);

    // Task de BD: "Registrar fecha de asignacion o modificacion del rol".
    // Se inicializa con creado_en: el rol se asigno al crear el usuario.
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN "rol_asignado_en" timestamptz`,
    );
    await queryRunner.query(
      `UPDATE "usuarios" SET "rol_asignado_en" = "creado_en" WHERE "rol_asignado_en" IS NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "usuarios"."rol_asignado_en" IS 'Backlog 1.6: fecha del ultimo cambio de rol (o de creacion si nunca cambio).'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "rol_asignado_en"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "permisos_rol_unico"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permisos_rol"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "nivel_permiso"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "modulo_sistema"`);
  }
}
