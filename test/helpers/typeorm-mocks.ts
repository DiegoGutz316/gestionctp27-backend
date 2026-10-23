/** Utilidades para simular repositorios y QueryBuilders de TypeORM en pruebas unitarias. */

const ENCADENABLES = [
  'select',
  'addSelect',
  'from',
  'where',
  'andWhere',
  'orWhere',
  'orderBy',
  'addOrderBy',
  'skip',
  'take',
  'limit',
  'offset',
  'innerJoin',
  'leftJoin',
  'innerJoinAndSelect',
  'leftJoinAndSelect',
  'groupBy',
  'addGroupBy',
  'having',
  'setParameter',
  'setParameters',
  'distinct',
  'setLock',
  'insert',
  'update',
  'set',
  'into',
  'values',
  'orIgnore',
] as const;

const TERMINALES = [
  'getMany',
  'getManyAndCount',
  'getOne',
  'getRawMany',
  'getRawOne',
  'getCount',
  'execute',
] as const;

export type QueryBuilderSimulado = Record<
  (typeof ENCADENABLES)[number] | (typeof TERMINALES)[number],
  jest.Mock
>;

/**
 * QueryBuilder encadenable: los métodos de construcción devuelven el propio
 * objeto y los terminales resuelven con los valores indicados.
 */
export function crearQueryBuilderSimulado(
  resultados: Partial<Record<(typeof TERMINALES)[number], unknown>> = {},
): QueryBuilderSimulado {
  const qb = {} as QueryBuilderSimulado;
  for (const metodo of ENCADENABLES) qb[metodo] = jest.fn(() => qb);
  for (const metodo of TERMINALES) {
    qb[metodo] = jest
      .fn()
      .mockResolvedValue(
        metodo in resultados
          ? resultados[metodo]
          : metodo === 'getManyAndCount'
            ? [[], 0]
            : metodo === 'getMany' || metodo === 'getRawMany'
              ? []
              : metodo === 'getCount'
                ? 0
                : null,
      );
  }
  return qb;
}

/** Repositorio con los métodos habituales como jest.fn() (create devuelve su argumento). */
export function crearRepositorioSimulado(
  qb: QueryBuilderSimulado = crearQueryBuilderSimulado(),
) {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    count: jest.fn(),
    exist: jest.fn(),
    save: jest.fn((entidad: unknown) => Promise.resolve(entidad)),
    create: jest.fn((datos: unknown) => datos),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
    qb,
  };
}
