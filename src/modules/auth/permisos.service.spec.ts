/**
 * Pruebas unitarias - PermisosService (soporte de PermisosGuard y GET /auth/permisos)
 */
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { ModuloSistema } from './enums/modulo-sistema.enum';
import { NivelPermiso } from './enums/nivel-permiso.enum';
import { PermisosService } from './permisos.service';

describe('PermisosService', () => {
  const repo = { find: jest.fn() };
  let servicio: PermisosService;
  const filas = [
    {
      rol: RolUsuario.DIRECTORA,
      modulo: ModuloSistema.AGRICOLA,
      nivel: NivelPermiso.LECTURA,
    },
    {
      rol: RolUsuario.ADMINISTRADOR,
      modulo: ModuloSistema.AGRICOLA,
      nivel: NivelPermiso.COMPLETO,
    },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
    repo.find.mockResolvedValue(filas);
    servicio = new PermisosService(repo as never);
  });

  it('matrizDe: completa los módulos sin fila con NINGUNO', async () => {
    const matriz = await servicio.matrizDe(RolUsuario.DIRECTORA);
    expect(matriz[ModuloSistema.AGRICOLA]).toBe(NivelPermiso.LECTURA);
    expect(matriz[ModuloSistema.USUARIOS]).toBe(NivelPermiso.NINGUNO);
    expect(Object.keys(matriz).sort()).toEqual(
      Object.values(ModuloSistema).sort(),
    );
  });

  it('rol sin filas: todo NINGUNO', async () => {
    const matriz = await servicio.matrizDe(RolUsuario.ESTUDIANTE);
    expect(Object.values(matriz).every((n) => n === NivelPermiso.NINGUNO)).toBe(
      true,
    );
  });

  it('nivelDe devuelve el nivel del módulo', async () => {
    expect(
      await servicio.nivelDe(RolUsuario.ADMINISTRADOR, ModuloSistema.AGRICOLA),
    ).toBe(NivelPermiso.COMPLETO);
  });

  describe('puede (COMPLETO incluye LECTURA)', () => {
    it.each([
      [RolUsuario.ADMINISTRADOR, NivelPermiso.COMPLETO, true],
      [RolUsuario.ADMINISTRADOR, NivelPermiso.LECTURA, true],
      [RolUsuario.DIRECTORA, NivelPermiso.LECTURA, true],
      [RolUsuario.DIRECTORA, NivelPermiso.COMPLETO, false],
      [RolUsuario.ESTUDIANTE, NivelPermiso.LECTURA, false],
    ])('%s requiere %s en AGRICOLA -> %s', async (rol, nivel, esperado) => {
      expect(await servicio.puede(rol, ModuloSistema.AGRICOLA, nivel)).toBe(
        esperado,
      );
    });
  });

  it('cachea la matriz: varias consultas leen la BD una sola vez', async () => {
    await servicio.puede(
      RolUsuario.ADMINISTRADOR,
      ModuloSistema.AGRICOLA,
      NivelPermiso.LECTURA,
    );
    await servicio.matrizDe(RolUsuario.DIRECTORA);
    await servicio.nivelDe(RolUsuario.DIRECTORA, ModuloSistema.PANEL);
    expect(repo.find).toHaveBeenCalledTimes(1);
  });

  it('la caché expira a los 60 s y se relee', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    await servicio.matrizDe(RolUsuario.ADMINISTRADOR);
    jest.setSystemTime(new Date('2026-10-01T00:00:59Z'));
    await servicio.matrizDe(RolUsuario.ADMINISTRADOR);
    expect(repo.find).toHaveBeenCalledTimes(1);
    jest.setSystemTime(new Date('2026-10-01T00:01:01Z'));
    await servicio.matrizDe(RolUsuario.ADMINISTRADOR);
    expect(repo.find).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('invalidarCache fuerza la relectura', async () => {
    await servicio.matrizDe(RolUsuario.ADMINISTRADOR);
    servicio.invalidarCache();
    await servicio.matrizDe(RolUsuario.ADMINISTRADOR);
    expect(repo.find).toHaveBeenCalledTimes(2);
  });

  describe('si la BD falla se deniega por defecto', () => {
    beforeEach(() => {
      repo.find.mockRejectedValue(new Error('conexión caída'));
      jest
        .spyOn(
          (servicio as unknown as { logger: { error: () => void } }).logger,
          'error',
        )
        .mockImplementation();
    });

    it('devuelve NINGUNO en todo, incluso para el administrador', async () => {
      const matriz = await servicio.matrizDe(RolUsuario.ADMINISTRADOR);
      expect(
        Object.values(matriz).every((n) => n === NivelPermiso.NINGUNO),
      ).toBe(true);
      expect(
        await servicio.puede(
          RolUsuario.ADMINISTRADOR,
          ModuloSistema.USUARIOS,
          NivelPermiso.LECTURA,
        ),
      ).toBe(false);
    });

    it('no cachea el fallo: reintenta en la siguiente petición', async () => {
      await servicio.matrizDe(RolUsuario.ADMINISTRADOR);
      repo.find.mockResolvedValue(filas);
      expect(
        (await servicio.matrizDe(RolUsuario.ADMINISTRADOR))[
          ModuloSistema.AGRICOLA
        ],
      ).toBe(NivelPermiso.COMPLETO);
    });
  });
});
