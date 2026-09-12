import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Los backlogs de produccion y salud acotaron `especie` y `estado` a listas
 * fijas (`EspecieAnimal` y `EstadoAnimal`), pero los animales ya registrados
 * conservaban los valores libres anteriores. El efecto era que ningun animal
 * existente se podia editar (el DTO rechazaba sus propios datos) y que los
 * activos contaban como inactivos donde se comprueba `estado === 'ACTIVO'`.
 *
 * Esta migracion convierte los datos existentes:
 *  - `especie`: de los nombres genericos (Bovino, Porcino...) a la lista nueva.
 *  - `estado`: todo lo que no sea una baja pasa a ACTIVO.
 *
 * La condicion sanitaria que guardaba `estado` (SALUDABLE, GESTANTE...) se
 * pierde a proposito: ese dato pertenece ahora al modulo de salud, y los
 * registros afectados eran de prueba.
 */
export class NormalizarEspecieYEstadoAnimales1800000000000 implements MigrationInterface {
  name = 'NormalizarEspecieYEstadoAnimales1800000000000';

  private readonly ESPECIES_VALIDAS = [
    'VACA',
    'CHANCHO',
    'GALLINA',
    'POLLO',
    'CABRA',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Se compara en mayusculas y sin espacios porque `especie` era texto libre.
    await queryRunner.query(`
      UPDATE "animales"
      SET "especie" = CASE upper(btrim("especie"))
        WHEN 'BOVINO'  THEN 'VACA'
        WHEN 'VACUNO'  THEN 'VACA'
        WHEN 'VACA'    THEN 'VACA'
        WHEN 'PORCINO' THEN 'CHANCHO'
        WHEN 'CERDO'   THEN 'CHANCHO'
        WHEN 'CHANCHO' THEN 'CHANCHO'
        WHEN 'CAPRINO' THEN 'CABRA'
        WHEN 'CABRA'   THEN 'CABRA'
        WHEN 'AVICOLA' THEN 'GALLINA'
        WHEN 'GALLINA' THEN 'GALLINA'
        WHEN 'POLLO'   THEN 'POLLO'
        ELSE upper(btrim("especie"))
      END
    `);

    // Si algo quedo fuera de la lista, es mejor parar que dejar filas que la
    // aplicacion no va a poder editar.
    const sinEquivalencia = (await queryRunner.query(
      `SELECT DISTINCT "especie" FROM "animales"
        WHERE "especie" <> ALL($1::text[])`,
      [this.ESPECIES_VALIDAS],
    )) as Array<{ especie: string }>;

    if (sinEquivalencia.length > 0) {
      const valores = sinEquivalencia.map((f) => f.especie).join(', ');
      throw new Error(
        `Hay especies sin equivalencia en EspecieAnimal: ${valores}. ` +
          'Agregue la conversion a esta migracion antes de aplicarla.',
      );
    }

    // La baja logica es lo unico que se conserva; el resto de estados
    // (SALUDABLE, GESTANTE...) eran condicion sanitaria, no estado del animal.
    await queryRunner.query(`
      UPDATE "animales"
      SET "estado" = CASE
        WHEN upper(btrim("estado")) = 'INACTIVO' THEN 'INACTIVO'
        ELSE 'ACTIVO'
      END
    `);
  }

  public async down(): Promise<void> {
    // No hay vuelta atras: los valores originales de `especie` y la condicion
    // sanitaria que guardaba `estado` no se conservan en ningun lado.
  }
}
