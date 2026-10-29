import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catalogo de cultivos y su enlace con las siembras.
 *
 * Hasta ahora el cultivo se escribia a mano en cada siembra. Eso hacia que
 * «Maiz» y «Maíz» fueran dos cultivos distintos y partia los totales de
 * produccion. Ahora se registra una vez, con su tipo y su descripcion, y la
 * siembra lo elige.
 *
 * Las siembras existentes no se pierden: de sus nombres se crea el catalogo
 * inicial y cada una queda enlazada al cultivo que le corresponde.
 *
 * `siembras.tipo_cultivo` se conserva con el nombre del cultivo. No es
 * redundancia por descuido: lo leen los filtros, los reportes y las
 * exportaciones en once archivos, y ademas deja constancia de como se llamaba
 * el cultivo cuando se sembro, aunque luego se renombre en el catalogo.
 */
export class CatalogoCultivos1819000000000 implements MigrationInterface {
  name = 'CatalogoCultivos1819000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cultivos" (
        "id" SERIAL PRIMARY KEY,
        "nombre" varchar(120) NOT NULL,
        "nombre_normalizado" varchar(120) NOT NULL,
        "tipo" varchar(30) NOT NULL,
        "descripcion" text,
        "activo" boolean NOT NULL DEFAULT true,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "creado_por" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "cultivos"
      ADD CONSTRAINT "cultivos_nombre_check"
      CHECK (btrim("nombre") <> '')
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'cultivos_tipo_check'
        ) THEN
          ALTER TABLE "cultivos"
          ADD CONSTRAINT "cultivos_tipo_check"
          CHECK ("tipo" IN (
            'HORTALIZA',
            'GRANO_BASICO',
            'RAIZ_TUBERCULO',
            'FRUTA',
            'HIERBA_AROMATICA',
            'OTRO'
          ));
        END IF;
      END
      $$;
    `);

    // El nombre es unico sin distinguir mayusculas ni tildes.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "cultivos_nombre_normalizado_unico"
      ON "cultivos" ("nombre_normalizado")
    `);

    // Catalogo inicial a partir de lo ya sembrado. `translate` quita las
    // tildes sin necesitar la extension unaccent, que no siempre esta.
    await queryRunner.query(`
      INSERT INTO "cultivos" (
        "nombre", "nombre_normalizado", "tipo", "descripcion", "creado_por"
      )
      SELECT DISTINCT ON (normalizado)
        s.nombre,
        s.normalizado,
        'OTRO',
        'Creado automáticamente a partir de las siembras ya registradas.',
        s."creado_por"
      FROM (
        SELECT
          nombre,
          normalizado,
          "creado_por",
          count(*) OVER (PARTITION BY normalizado, nombre) AS usos
        FROM (
          SELECT
            btrim("tipo_cultivo") AS nombre,
            "creado_por",
            translate(
              lower(btrim("tipo_cultivo")),
              'áàäâãéèëêíìïîóòöôõúùüûñç',
              'aaaaaeeeeiiiiooooouuuunc'
            ) AS normalizado
          FROM "siembras"
        ) AS base
      ) AS s
      WHERE s.nombre <> ''
      -- Entre variantes del mismo nombre («Maíz», «maiz», «MAIZ») se queda la
      -- mas escrita, y si empatan la primera alfabeticamente. Sin este orden
      -- gana la fila que la base lea primero, y la migracion da un resultado
      -- distinto en cada base.
      ORDER BY s.normalizado, s.usos DESC, s.nombre
      ON CONFLICT ("nombre_normalizado") DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "siembras"
      ADD COLUMN IF NOT EXISTS "cultivo_id" integer
    `);

    await queryRunner.query(`
      UPDATE "siembras" s
      SET "cultivo_id" = c."id"
      FROM "cultivos" c
      WHERE c."nombre_normalizado" = translate(
        lower(btrim(s."tipo_cultivo")),
        'áàäâãéèëêíìïîóòöôõúùüûñç',
        'aaaaaeeeeiiiiooooouuuunc'
      )
      AND s."cultivo_id" IS NULL
    `);

    // Siembras viejas con el cultivo vacio o en blanco: no se les creo cultivo
    // y el SET NOT NULL de abajo detendria la migracion. Se les da uno de
    // respaldo, que solo se crea si hace falta, para no dejar un cultivo
    // inventado en las bases donde esto no pasa. `tipo_cultivo` no se toca: es
    // el texto original de la siembra y sigue siendo su historia.
    await queryRunner.query(`
      INSERT INTO "cultivos" (
        "nombre", "nombre_normalizado", "tipo", "descripcion", "creado_por"
      )
      SELECT
        'Sin nombre',
        'sin nombre',
        'OTRO',
        'Creado automáticamente para siembras que no indicaban cultivo. Reasígnelas al cultivo que corresponda.',
        s."creado_por"
      FROM "siembras" s
      WHERE s."cultivo_id" IS NULL
      LIMIT 1
      ON CONFLICT ("nombre_normalizado") DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "siembras" s
      SET "cultivo_id" = c."id"
      FROM "cultivos" c
      WHERE c."nombre_normalizado" = 'sin nombre'
      AND s."cultivo_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "siembras"
      ALTER COLUMN "cultivo_id" SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'siembras_cultivo_fk'
        ) THEN
          ALTER TABLE "siembras"
          ADD CONSTRAINT "siembras_cultivo_fk"
          FOREIGN KEY ("cultivo_id") REFERENCES "cultivos"("id")
          ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "siembras_cultivo_id_idx"
      ON "siembras" ("cultivo_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "siembras_cultivo_id_idx"`);
    await queryRunner.query(`
      ALTER TABLE "siembras" DROP CONSTRAINT IF EXISTS "siembras_cultivo_fk"
    `);
    await queryRunner.query(`
      ALTER TABLE "siembras" DROP COLUMN IF EXISTS "cultivo_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "cultivos"`);
  }
}
