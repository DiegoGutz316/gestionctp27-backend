import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega «Verdura» a los tipos de cultivo.
 *
 * El CHECK de `cultivos.tipo` enumera los valores permitidos, asi que hay que
 * rehacerlo: Postgres no permite ampliar una restriccion en sitio.
 *
 * La vuelta atras solo es posible si ningun cultivo quedo como VERDURA; si los
 * hay, se pasan a OTRO antes de restaurar la lista anterior, porque dejarlos
 * con un valor que el CHECK rechaza impediria recrearlo.
 */
export class TipoCultivoVerdura1820000000000 implements MigrationInterface {
  name = 'TipoCultivoVerdura1820000000000';

  private static readonly TIPOS_CON_VERDURA = [
    'HORTALIZA',
    'VERDURA',
    'GRANO_BASICO',
    'RAIZ_TUBERCULO',
    'FRUTA',
    'HIERBA_AROMATICA',
    'OTRO',
  ];

  private static readonly TIPOS_SIN_VERDURA = [
    'HORTALIZA',
    'GRANO_BASICO',
    'RAIZ_TUBERCULO',
    'FRUTA',
    'HIERBA_AROMATICA',
    'OTRO',
  ];

  private async rehacerCheck(
    queryRunner: QueryRunner,
    tipos: string[],
  ): Promise<void> {
    const lista = tipos.map((tipo) => `'${tipo}'`).join(', ');

    await queryRunner.query(`
      ALTER TABLE "cultivos" DROP CONSTRAINT IF EXISTS "cultivos_tipo_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "cultivos"
      ADD CONSTRAINT "cultivos_tipo_check"
      CHECK ("tipo" IN (${lista}))
    `);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.rehacerCheck(
      queryRunner,
      TipoCultivoVerdura1820000000000.TIPOS_CON_VERDURA,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "cultivos" SET "tipo" = 'OTRO' WHERE "tipo" = 'VERDURA'
    `);
    await this.rehacerCheck(
      queryRunner,
      TipoCultivoVerdura1820000000000.TIPOS_SIN_VERDURA,
    );
  }
}
