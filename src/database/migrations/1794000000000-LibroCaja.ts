import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Libro de caja: módulo independiente de inventario.
 * Tablas: informacion_colegio, departamentos_caja, periodos_caja, fondos_caja.
 * También agrega LIBRO_CAJA a la matriz de permisos.
 */
export class LibroCaja1794000000000 implements MigrationInterface {
  name = 'LibroCaja1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "permisos_rol"
      ALTER COLUMN "modulo" TYPE varchar(40)
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "modulo_sistema"`);
    await queryRunner.query(`
      CREATE TYPE "modulo_sistema" AS ENUM (
        'PANEL',
        'USUARIOS',
        'PECUARIA',
        'AGRICOLA',
        'INVENTARIO',
        'LIBRO_CAJA',
        'REPORTES'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "permisos_rol"
      ALTER COLUMN "modulo" TYPE "modulo_sistema"
      USING "modulo"::"modulo_sistema"
    `);

    await queryRunner.query(`
      INSERT INTO "permisos_rol" ("rol", "modulo", "nivel") VALUES
        ('ADMINISTRADOR',    'LIBRO_CAJA', 'COMPLETO'),
        ('DIRECTORA',        'LIBRO_CAJA', 'LECTURA'),
        ('DOCENTE_PECUARIO', 'LIBRO_CAJA', 'COMPLETO'),
        ('DOCENTE_AGRICOLA', 'LIBRO_CAJA', 'COMPLETO'),
        ('ESTUDIANTE',       'LIBRO_CAJA', 'NINGUNO')
    `);

    await queryRunner.query(`
      CREATE TABLE "informacion_colegio" (
        "id"                      integer      NOT NULL DEFAULT 1,
        "nombre"                  varchar(150) NOT NULL,
        "numero_cuenta_bancaria"  varchar(50)  NOT NULL DEFAULT '',
        "entidad_deposito"        varchar(150) NOT NULL DEFAULT '',
        "creado_en"               timestamptz  NOT NULL DEFAULT now(),
        "actualizado_en"          timestamptz  NOT NULL DEFAULT now(),
        "actualizado_por"         uuid,
        CONSTRAINT "informacion_colegio_pk" PRIMARY KEY ("id"),
        CONSTRAINT "informacion_colegio_unica" CHECK ("id" = 1)
      )
    `);
    await queryRunner.query(
      `COMMENT ON TABLE "informacion_colegio" IS 'Datos institucionales y bancarios que encabezan el libro de caja. Una sola fila.'`,
    );
    await queryRunner.query(`
      INSERT INTO "informacion_colegio" ("id", "nombre")
      VALUES (1, 'CTP 27 de abril')
    `);

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
      CREATE TABLE "departamentos_caja" (
        "id"              serial                 NOT NULL,
        "nombre_unidad"   varchar(120)           NOT NULL,
        "tipo_actividad"  "tipo_actividad_caja"  NOT NULL,
        "activo"          boolean                NOT NULL DEFAULT true,
        "creado_en"       timestamptz            NOT NULL DEFAULT now(),
        "actualizado_en"  timestamptz            NOT NULL DEFAULT now(),
        "creado_por"      uuid,
        "actualizado_por" uuid,
        CONSTRAINT "departamentos_caja_pk" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_departamentos_caja_nombre" ON "departamentos_caja" (lower("nombre_unidad")) WHERE "activo" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "departamentos_caja_activo_idx" ON "departamentos_caja" ("activo")`,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "departamentos_caja" IS 'Unidades productivas del libro de caja (nombre de unidad y tipo de actividad).'`,
    );

    await queryRunner.query(
      `CREATE TYPE "estado_periodo_caja" AS ENUM ('ABIERTO', 'CERRADO')`,
    );
    await queryRunner.query(`
      CREATE TABLE "periodos_caja" (
        "id"              serial                NOT NULL,
        "nombre"          varchar(120)          NOT NULL,
        "fecha_inicio"    date                  NOT NULL,
        "fecha_fin"       date                  NOT NULL,
        "estado"          "estado_periodo_caja" NOT NULL DEFAULT 'ABIERTO',
        "creado_en"       timestamptz           NOT NULL DEFAULT now(),
        "actualizado_en"  timestamptz           NOT NULL DEFAULT now(),
        "creado_por"      uuid,
        "actualizado_por" uuid,
        CONSTRAINT "periodos_caja_pk" PRIMARY KEY ("id"),
        CONSTRAINT "chk_periodos_caja_fechas" CHECK ("fecha_inicio" <= "fecha_fin")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "periodos_caja_estado_idx" ON "periodos_caja" ("estado")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "periodos_caja_abierto_uq" ON "periodos_caja" ("estado") WHERE "estado" = 'ABIERTO'`,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "periodos_caja" IS 'Periodos del libro de caja. Al abrir uno se cargan todos los departamentos activos.'`,
    );

    await queryRunner.query(
      `CREATE TYPE "estado_fondo_caja" AS ENUM ('PENDIENTE', 'SOLICITADO')`,
    );
    await queryRunner.query(`
      CREATE TABLE "fondos_caja" (
        "id"               serial              NOT NULL,
        "periodo_id"       integer             NOT NULL,
        "departamento_id"  integer             NOT NULL,
        "monto_solicitado" numeric(12,2),
        "estado"           "estado_fondo_caja" NOT NULL DEFAULT 'PENDIENTE',
        "solicitado_en"    timestamptz,
        "solicitado_por"   uuid,
        "creado_en"        timestamptz         NOT NULL DEFAULT now(),
        "actualizado_en"   timestamptz         NOT NULL DEFAULT now(),
        CONSTRAINT "fondos_caja_pk" PRIMARY KEY ("id"),
        CONSTRAINT "fk_fondos_caja_periodo"
          FOREIGN KEY ("periodo_id") REFERENCES "periodos_caja" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_fondos_caja_departamento"
          FOREIGN KEY ("departamento_id") REFERENCES "departamentos_caja" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "chk_fondos_caja_monto" CHECK (
          "monto_solicitado" IS NULL OR "monto_solicitado" > 0
        )
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "fondos_caja_periodo_departamento_uq" ON "fondos_caja" ("periodo_id", "departamento_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "fondos_caja_estado_idx" ON "fondos_caja" ("estado")`,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "fondos_caja" IS 'Fondo de caja inicial de cada departamento dentro de un periodo.'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "fondos_caja"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_fondo_caja"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "periodos_caja"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estado_periodo_caja"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departamentos_caja"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_actividad_caja"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "informacion_colegio"`);

    await queryRunner.query(
      `DELETE FROM "permisos_rol" WHERE "modulo"::text = 'LIBRO_CAJA'`,
    );
    await queryRunner.query(`
      ALTER TABLE "permisos_rol"
      ALTER COLUMN "modulo" TYPE varchar(40)
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "modulo_sistema"`);
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
      ALTER TABLE "permisos_rol"
      ALTER COLUMN "modulo" TYPE "modulo_sistema"
      USING "modulo"::"modulo_sistema"
    `);
  }
}
