/**
 * Pruebas unitarias - ColegioService (soporte de /libro-caja/colegio)
 * Usa la LibroCajaPolicy real: solo ADMINISTRADOR puede modificar.
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { crearRepositorioSimulado } from '../../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { ColegioService } from './colegio.service';

const dto = {
  nombre: 'CTP 27 de Abril',
  numeroCuentaBancaria: '100-01',
  entidadDeposito: 'Banco Nacional',
};
const usuario = (rol: RolUsuario) => ({
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol,
});
const fila = (extra: object = {}) => ({
  id: 1,
  nombre: 'Colegio',
  numeroCuentaBancaria: '1',
  entidadDeposito: 'B',
  actualizadoEn: new Date('2026-01-01'),
  actualizadoPor: null,
  ...extra,
});

describe('ColegioService', () => {
  let repo: ReturnType<typeof crearRepositorioSimulado>;
  let servicio: ColegioService;

  beforeEach(() => {
    repo = crearRepositorioSimulado();
    servicio = new ColegioService(repo as never, new LibroCajaPolicy());
  });

  describe('obtener (GET)', () => {
    it('devuelve la fila única (id = 1)', async () => {
      repo.findOne.mockResolvedValue(fila());
      expect(await servicio.obtener()).toEqual({
        id: 1,
        nombre: 'Colegio',
        numeroCuentaBancaria: '1',
        entidadDeposito: 'B',
        actualizadoEn: new Date('2026-01-01'),
      });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('si no existe la crea con valores predeterminados', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockImplementation((e: object) =>
        Promise.resolve({ actualizadoEn: new Date(), ...e }),
      );

      const r = await servicio.obtener();

      expect(repo.create).toHaveBeenCalledWith({
        id: 1,
        nombre: 'CTP 27 de abril',
        numeroCuentaBancaria: '',
        entidadDeposito: '',
        actualizadoPor: null,
      });
      expect(r.nombre).toBe('CTP 27 de abril');
    });

    it('carrera al crear: si el guardado falla pero otra petición ya la creó, la devuelve', async () => {
      repo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(fila({ nombre: 'Creada por otro' }));
      repo.save.mockRejectedValue(new Error('duplicate key'));
      expect((await servicio.obtener()).nombre).toBe('Creada por otro');
    });

    it('si falla el guardado y sigue sin existir: 404', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockRejectedValue(new Error('x'));
      await expect(servicio.obtener()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('actualizar (PUT)', () => {
    it('administrador: actualiza y audita', async () => {
      repo.findOne.mockResolvedValue(fila());
      const r = await servicio.actualizar(
        dto,
        usuario(RolUsuario.ADMINISTRADOR),
      );
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ ...dto, actualizadoPor: 'u-1' }),
      );
      expect(r).toMatchObject(dto);
    });

    it.each([
      RolUsuario.DIRECTORA,
      RolUsuario.DOCENTE_AGRICOLA,
      RolUsuario.DOCENTE_PECUARIO,
      RolUsuario.ESTUDIANTE,
    ])('%s: 403 sin tocar la BD', async (rol) => {
      await expect(
        servicio.actualizar(dto, usuario(rol)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
