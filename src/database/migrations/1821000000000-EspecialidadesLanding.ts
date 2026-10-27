import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catálogo editable de especialidades técnicas de la landing pública.
 * Las fotos se guardan en bytea (igual que los flyers de avisos); si aún no
 * hay foto subida, la landing usa la ruta estática de respaldo.
 */
export class EspecialidadesLanding1821000000000 implements MigrationInterface {
  name = 'EspecialidadesLanding1821000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "especialidades_landing" (
        "id"              serial         NOT NULL,
        "nombre"          varchar(120)   NOT NULL,
        "descripcion"     varchar(400)   NOT NULL,
        "icono"           varchar(40)    NOT NULL,
        "acento"          varchar(60)    NOT NULL,
        "foto_alt"        varchar(250)   NOT NULL DEFAULT '',
        "posicion_foto"   varchar(40),
        "foto_estatica"   varchar(250),
        "foto"            bytea,
        "foto_tipo"       varchar(40),
        "orden"           integer        NOT NULL DEFAULT 0,
        "activo"          boolean        NOT NULL DEFAULT true,
        "creado_en"       timestamptz    NOT NULL DEFAULT now(),
        "actualizado_en"  timestamptz    NOT NULL DEFAULT now(),
        "creado_por"      uuid,
        "actualizado_por" uuid,
        CONSTRAINT "especialidades_landing_pk" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "especialidades_landing_activo_orden_idx"
      ON "especialidades_landing" ("activo", "orden", "id")
    `);

    await queryRunner.query(`
      INSERT INTO "especialidades_landing"
        ("nombre", "descripcion", "icono", "acento", "foto_alt", "posicion_foto", "foto_estatica", "orden")
      VALUES
        (
          'Producción Agrícola y Pecuaria',
          'Formación en manejo de cultivos, producción animal y procesos agropecuarios.',
          'SPROUT',
          'var(--acento-agro)',
          'Estudiantes en el corral observan reses acostadas durante una práctica de manejo de ganado',
          'center 45%',
          '/landing/especialidades/produccion-pecuaria-campo.jpg',
          1
        ),
        (
          'Diseño y Desarrollo Digital',
          'Desarrollo de software, diseño digital y tecnologías web.',
          'MONITOR',
          'var(--acento-digital)',
          'Computadora portátil sobre una mesa, con código de programación en la pantalla',
          NULL,
          '/landing/especialidades/diseno-desarrollo-digital.jpg',
          2
        ),
        (
          'Gerencia y Producción de Cocina',
          'Técnicas culinarias y gestión de servicios gastronómicos.',
          'CHEF_HAT',
          'var(--acento-cocina)',
          'Grupo de estudiantes con gorro y uniforme blanco junto a una mesa llena de panes recién horneados',
          NULL,
          '/landing/especialidades/cocina-panaderia.jpg',
          3
        ),
        (
          'Agroindustria Alimentaria',
          'Procesamiento y transformación de productos alimenticios.',
          'FACTORY',
          'var(--acento-agroindustria)',
          'Estudiantes con delantal y cubrebocas cortan carne sobre mesas de acero en la sala de práctica',
          'center 45%',
          '/landing/especialidades/agroindustria-carniceria.jpg',
          4
        ),
        (
          'Inspección de la Industria Alimentaria',
          'Control de calidad e inocuidad en procesos alimentarios.',
          'MICROSCOPE',
          'var(--acento-inspeccion)',
          'Estudiante con gabacha mira por un microscopio en el laboratorio, entre frascos de reactivos',
          'center 40%',
          '/landing/especialidades/inspeccion-laboratorio.jpg',
          5
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "especialidades_landing_activo_orden_idx"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "especialidades_landing"`);
  }
}
