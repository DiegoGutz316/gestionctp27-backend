import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventarioInsumos1784267084230 implements MigrationInterface {
  name = 'InventarioInsumos1784267084230';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "categorias_insumo" ("id" SERIAL NOT NULL, "nombre" character varying(60) NOT NULL, "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f84eef80a3339fd765bb6035d20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "insumos" ("id" SERIAL NOT NULL, "nombre" character varying(120) NOT NULL, "unidad_medida" character varying(10) NOT NULL, "cantidad" numeric(12,2) NOT NULL, "nivel_minimo" numeric(12,2) NOT NULL DEFAULT '0', "activo" boolean NOT NULL DEFAULT true, "creado_por" uuid, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "categoria_id" integer NOT NULL, CONSTRAINT "PK_b4e1b727a7b140e698e3a3dc7af" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "insumos" ADD CONSTRAINT "FK_998362c3f6fd2e8f4b19aa4d5da" FOREIGN KEY ("categoria_id") REFERENCES "categorias_insumo"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Índices únicos de expresión (case-insensitive), parciales sobre
    // registros activos para que la eliminación lógica no bloquee
    // recrear un nombre. Se mantienen a mano (synchronize:false en las
    // entidades).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_categorias_insumo_nombre" ON "categorias_insumo" (lower("nombre")) WHERE "activo" = true`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_insumos_nombre_categoria" ON "insumos" (lower("nombre"), "categoria_id") WHERE "activo" = true`,
    );

    // Reglas de negocio a nivel de BD.
    await queryRunner.query(
      `ALTER TABLE "insumos" ADD CONSTRAINT "chk_insumos_cantidad" CHECK ("cantidad" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "insumos" ADD CONSTRAINT "chk_insumos_nivel_minimo" CHECK ("nivel_minimo" >= 0)`,
    );

    // Seed de categorías iniciales.
    await queryRunner.query(
      `INSERT INTO "categorias_insumo" ("nombre") VALUES ('Alimento'),('Fertilizante'),('Medicamento'),('Herramienta'),('Otro')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "insumos" DROP CONSTRAINT "chk_insumos_nivel_minimo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "insumos" DROP CONSTRAINT "chk_insumos_cantidad"`,
    );
    await queryRunner.query(`DROP INDEX "uq_insumos_nombre_categoria"`);
    await queryRunner.query(`DROP INDEX "uq_categorias_insumo_nombre"`);
    await queryRunner.query(
      `ALTER TABLE "insumos" DROP CONSTRAINT "FK_998362c3f6fd2e8f4b19aa4d5da"`,
    );
    await queryRunner.query(`DROP TABLE "insumos"`);
    await queryRunner.query(`DROP TABLE "categorias_insumo"`);
  }
}
