/**
 * Pruebas unitarias - IntentosLoginService (bloqueo de login por correo)
 *
 * El conteo real corre en SQL (upsert atómico); aquí se verifica el contrato
 * con la BD (parámetros), la conversión de resultados y la tolerancia a fallos.
 */
import {
  IntentosLoginService,
  MAX_INTENTOS_FALLIDOS,
  MINUTOS_DE_BLOQUEO,
  MINUTOS_DE_RETENCION,
} from './intentos-login.service';

describe('IntentosLoginService', () => {
  const repo = { query: jest.fn(), delete: jest.fn() };
  let servicio: IntentosLoginService;

  beforeEach(() => {
    jest.resetAllMocks();
    servicio = new IntentosLoginService(repo as never);
  });

  it('constantes de política: 5 fallos, 10 min de bloqueo, 60 min de retención', () => {
    expect([
      MAX_INTENTOS_FALLIDOS,
      MINUTOS_DE_BLOQUEO,
      MINUTOS_DE_RETENCION,
    ]).toEqual([5, 10, 60]);
  });

  describe('segundosRestantes', () => {
    it('sin bloqueo (sin filas): null', async () => {
      repo.query.mockResolvedValue([]);
      expect(await servicio.segundosRestantes('a@b.cr')).toBeNull();
      expect(repo.query).toHaveBeenCalledWith(
        expect.stringContaining('bloqueado_hasta'),
        ['a@b.cr'],
      );
    });

    it('convierte el numeric de Postgres (string) a número', async () => {
      repo.query.mockResolvedValue([{ segundos: '420' }]);
      expect(await servicio.segundosRestantes('a@b.cr')).toBe(420);
    });

    it.each([[null], ['0'], ['-3'], ['abc']])(
      'valor %p no es un bloqueo válido: null',
      async (segundos) => {
        repo.query.mockResolvedValue([{ segundos }]);
        expect(await servicio.segundosRestantes('a@b.cr')).toBeNull();
      },
    );
  });

  describe('registrarFallo', () => {
    it('envía el upsert con correo, máximo, bloqueo y retención', async () => {
      repo.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ segundos: null }]);

      expect(await servicio.registrarFallo('a@b.cr')).toBeNull();

      const [sql, params] = repo.query.mock.calls[1] as [string, unknown[]];
      expect(sql).toContain('ON CONFLICT ("correo")');
      expect(params).toEqual(['a@b.cr', 5, 10, 60]);
    });

    it('si este fallo activó el bloqueo devuelve los segundos', async () => {
      repo.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ segundos: '600' }]);
      expect(await servicio.registrarFallo('a@b.cr')).toBe(600);
    });

    it('purga antes de contar y excluye el correo en curso', async () => {
      repo.query.mockResolvedValue([]);
      await servicio.registrarFallo('a@b.cr');
      const [sql, params] = repo.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('DELETE FROM "intentos_login"');
      expect(params).toEqual(['a@b.cr', 60, 200]);
    });

    it('un error al purgar no impide registrar el fallo', async () => {
      jest
        .spyOn(
          (servicio as unknown as { logger: { warn: () => void } }).logger,
          'warn',
        )
        .mockImplementation();
      repo.query
        .mockRejectedValueOnce(new Error('sin permisos'))
        .mockResolvedValueOnce([{ segundos: '30' }]);
      expect(await servicio.registrarFallo('a@b.cr')).toBe(30);
    });

    it('un error del upsert sí se propaga', async () => {
      repo.query
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('BD caída'));
      await expect(servicio.registrarFallo('a@b.cr')).rejects.toThrow(
        'BD caída',
      );
    });
  });

  it('limpiar borra el registro del correo', async () => {
    await servicio.limpiar('a@b.cr');
    expect(repo.delete).toHaveBeenCalledWith({ correo: 'a@b.cr' });
  });
});
