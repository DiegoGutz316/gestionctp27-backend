/**
 * Pruebas unitarias - AnimalService (soporte de /pecuaria/animales)
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  crearQueryBuilderSimulado,
  crearRepositorioSimulado,
} from '../../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { AnimalService } from './animal.service';
import { CategoriaBovina } from './enums/categoria-bovina.enum';
import { EspecieAnimal } from './enums/especie-animal.enum';
import { EstadoAnimal } from './enums/estado-animal.enum';
import { OrdenAnimales } from './enums/orden-animales.enum';

const actor = {
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol: RolUsuario.DOCENTE_PECUARIO,
};
const dto = {
  codigo: 'CHA-001',
  nombre: 'Luna',
  especie: EspecieAnimal.CHANCHO,
  raza: 'Landrace',
  fechaNacimiento: '2025-01-10',
  estado: EstadoAnimal.ACTIVO,
};
const duplicadoPg = () =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('dup'), { code: '23505' }),
  );

describe('AnimalService', () => {
  let repo: ReturnType<typeof crearRepositorioSimulado>;
  let servicio: AnimalService;

  beforeEach(() => {
    repo = crearRepositorioSimulado();
    servicio = new AnimalService(repo as never);
  });

  describe('crear (POST)', () => {
    it('crea el animal con autor y sin categoría bovina para especies no bovinas', async () => {
      repo.findOne.mockResolvedValue(null);

      await servicio.crear(dto, actor);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          categoriaBovina: null,
          observaciones: null,
          creadoPor: 'u-1',
          actualizadoPor: null,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('vaca con categoría: la conserva', async () => {
      repo.findOne.mockResolvedValue(null);
      await servicio.crear(
        {
          ...dto,
          especie: EspecieAnimal.VACA,
          categoriaBovina: CategoriaBovina.NOVILLA,
        },
        actor,
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaBovina: CategoriaBovina.NOVILLA }),
      );
    });

    it('especie no bovina con categoría bovina: 400, no se ignora', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        servicio.crear(
          { ...dto, categoriaBovina: CategoriaBovina.TORO },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('vaca sin categoría: 400', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        servicio.crear({ ...dto, especie: EspecieAnimal.VACA }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('código repetido: 409 con el código en el mensaje', async () => {
      repo.findOne.mockResolvedValue({ id: 1 });
      await expect(servicio.crear(dto, actor)).rejects.toThrow(
        new ConflictException(
          'Ya existe un animal registrado con el código "CHA-001".',
        ),
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('carrera: violación UNIQUE al guardar también da 409', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockRejectedValue(duplicadoPg());
      await expect(servicio.crear(dto, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('otro error de BD se propaga', async () => {
      repo.findOne.mockResolvedValue(null);
      const fallo = new Error('caída');
      repo.save.mockRejectedValue(fallo);
      await expect(servicio.crear(dto, actor)).rejects.toBe(fallo);
    });
  });

  describe('listar (GET)', () => {
    it('por defecto excluye inactivos y ordena por nombre', async () => {
      const qb = crearQueryBuilderSimulado({ getMany: [{ id: 1 }] });
      repo.createQueryBuilder.mockReturnValue(qb);

      const r = await servicio.listar({
        incluirInactivos: false,
        orden: OrdenAnimales.NOMBRE,
      });

      expect(qb.where).toHaveBeenCalledWith(expect.stringContaining('!='), {
        inactivo: 'INACTIVO',
      });
      expect(qb.orderBy).toHaveBeenCalledWith('animal.nombre', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('animal.id', 'ASC');
      expect(r).toEqual([{ id: 1 }]);
    });

    it('incluirInactivos=true: no filtra por estado', async () => {
      const qb = crearQueryBuilderSimulado();
      repo.createQueryBuilder.mockReturnValue(qb);
      await servicio.listar({
        incluirInactivos: true,
        orden: OrdenAnimales.CODIGO,
      });
      expect(qb.where).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('animal.codigo', 'ASC');
    });

    it('búsqueda q sobre código, nombre y estado', async () => {
      const qb = crearQueryBuilderSimulado();
      repo.createQueryBuilder.mockReturnValue(qb);
      await servicio.listar({
        q: 'lu',
        incluirInactivos: false,
        orden: OrdenAnimales.ESTADO,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('animal.codigo'),
        { q: '%lu%' },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('animal.estado', 'ASC');
    });
  });

  describe('obtener (GET :id)', () => {
    it('devuelve el animal', async () => {
      repo.findOne.mockResolvedValue({ id: 5 });
      expect(await servicio.obtener(5)).toEqual({ id: 5 });
    });

    it('404 si no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(servicio.obtener(5)).rejects.toThrow(
        new NotFoundException('El animal no existe.'),
      );
    });
  });

  describe('actualizar (PATCH :id)', () => {
    it('actualiza campos y auditoría sin tocar creadoPor', async () => {
      const existente = { id: 5, codigo: 'VIEJO', creadoPor: 'otro' };
      repo.findOne.mockResolvedValue(existente);
      repo.qb.getOne.mockResolvedValue(null);

      const r = await servicio.actualizar(
        5,
        { ...dto, observaciones: 'ok' },
        actor,
      );

      expect(repo.qb.where).toHaveBeenCalledWith(
        'lower(animal.codigo) = lower(:codigo)',
        {
          codigo: 'CHA-001',
        },
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith('animal.id != :id', {
        id: 5,
      });
      expect(r).toMatchObject({
        codigo: 'CHA-001',
        nombre: 'Luna',
        observaciones: 'ok',
        actualizadoPor: 'u-1',
        creadoPor: 'otro',
      });
    });

    it('404 si no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(servicio.actualizar(5, dto, actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('código usado por OTRO animal: 409', async () => {
      repo.findOne.mockResolvedValue({ id: 5 });
      repo.qb.getOne.mockResolvedValue({ id: 6 });
      await expect(servicio.actualizar(5, dto, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('cambiar a vaca sin categoría: 400', async () => {
      repo.findOne.mockResolvedValue({ id: 5 });
      repo.qb.getOne.mockResolvedValue(null);
      await expect(
        servicio.actualizar(5, { ...dto, especie: EspecieAnimal.VACA }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('violación UNIQUE al guardar: 409', async () => {
      repo.findOne.mockResolvedValue({ id: 5 });
      repo.qb.getOne.mockResolvedValue(null);
      repo.save.mockRejectedValue(duplicadoPg());
      await expect(servicio.actualizar(5, dto, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('desactivar (PATCH :id/desactivar)', () => {
    it('marca INACTIVO y registra al actor (el registro se conserva)', async () => {
      repo.findOne.mockResolvedValue({ id: 5, estado: EstadoAnimal.ACTIVO });
      const r = await servicio.desactivar(5, actor);
      expect(r).toMatchObject({ estado: 'INACTIVO', actualizadoPor: 'u-1' });
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('404 si no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(servicio.desactivar(5, actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
