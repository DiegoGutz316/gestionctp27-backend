/* eslint-disable @typescript-eslint/no-unsafe-assignment -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas unitarias - UsuariosService (soporte de /usuarios y de AuthService)
 *
 * Repositorio TypeORM simulado; bcrypt real con la fábrica de hashes del
 * servicio (costo 12), por eso solo se hashea en los casos que lo requieren.
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import {
  crearQueryBuilderSimulado,
  crearRepositorioSimulado,
} from '../../../test/helpers/typeorm-mocks';
import { RolUsuario } from './enums/rol-usuario.enum';
import { UsuariosService } from './usuarios.service';

const ADMIN = {
  id: 'admin-1',
  correo: 'a@x.cr',
  nombre: 'Admin',
  rol: RolUsuario.ADMINISTRADOR,
};

function entidad(extra: Record<string, unknown> = {}) {
  return {
    id: 'u-1',
    nombre: 'Ana',
    correo: 'ana@ctp27.test',
    contrasenaHash: 'h',
    rol: RolUsuario.ESTUDIANTE,
    activo: true,
    creadoPor: 'admin-1',
    actualizadoPor: null,
    creadoEn: new Date('2026-01-01'),
    actualizadoEn: new Date('2026-01-02'),
    rolAsignadoEn: new Date('2026-01-01'),
    ...extra,
  };
}

function errorPg(code: string) {
  const e = new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('dup'), { code }),
  );
  return e;
}

describe('UsuariosService', () => {
  let repo: ReturnType<typeof crearRepositorioSimulado>;
  let servicio: UsuariosService;

  beforeEach(() => {
    repo = crearRepositorioSimulado();
    servicio = new UsuariosService(repo as never);
  });

  describe('crear (POST /usuarios)', () => {
    const dto = {
      nombre: '  Ana Mora ',
      correo: ' ANA@CTP27.test ',
      contrasena: 'Segura123',
      rol: RolUsuario.DOCENTE_PECUARIO,
      activo: true,
    };

    it('normaliza datos, hashea con bcrypt, audita al actor y no devuelve el hash', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockImplementation((u: object) =>
        Promise.resolve({
          id: 'nuevo',
          creadoEn: new Date(),
          actualizadoEn: new Date(),
          ...u,
        }),
      );

      const r = await servicio.crear(dto, ADMIN);

      const creado = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(creado).toMatchObject({
        nombre: 'Ana Mora',
        correo: 'ana@ctp27.test',
        rol: RolUsuario.DOCENTE_PECUARIO,
        activo: true,
        creadoPor: 'admin-1',
        ultimoAcceso: null,
      });
      expect(creado.rolAsignadoEn).toBeInstanceOf(Date);
      expect(creado.contrasenaHash).not.toBe('Segura123');
      expect(
        await bcrypt.compare('Segura123', creado.contrasenaHash as string),
      ).toBe(true);
      expect(r).not.toHaveProperty('contrasenaHash');
      expect(r).toMatchObject({ id: 'nuevo', correo: 'ana@ctp27.test' });
    }, 15000);

    it('sin actor, creadoPor queda null', async () => {
      repo.findOne.mockResolvedValue(null);
      await servicio.crear({ ...dto, contrasena: 'x'.repeat(8) });
      expect(
        (repo.create.mock.calls[0][0] as { creadoPor: unknown }).creadoPor,
      ).toBeNull();
    }, 15000);

    it('correo repetido: 409 sin hashear ni guardar', async () => {
      repo.findOne.mockResolvedValue(entidad());
      await expect(servicio.crear(dto, ADMIN)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { correo: 'ana@ctp27.test' },
      });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('carrera: violación UNIQUE de Postgres (23505) se traduce a 409', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockRejectedValue(errorPg('23505'));
      await expect(servicio.crear(dto, ADMIN)).rejects.toBeInstanceOf(
        ConflictException,
      );
    }, 15000);

    it('otros errores de BD se propagan sin cambios', async () => {
      repo.findOne.mockResolvedValue(null);
      const fallo = errorPg('08006');
      repo.save.mockRejectedValue(fallo);
      await expect(servicio.crear(dto, ADMIN)).rejects.toBe(fallo);
    }, 15000);
  });

  describe('listar (GET /usuarios)', () => {
    it('sin filtros: ordena por nombre ASC y arma la meta de paginación', async () => {
      repo.qb.getManyAndCount.mockResolvedValue([
        [entidad(), entidad({ id: 'u-2' })],
        12,
      ]);

      const r = await servicio.listar({
        pagina: 2,
        limite: 5,
        order: 'ASC',
      } as never);

      expect(repo.qb.orderBy).toHaveBeenCalledWith('usuario.nombre', 'ASC');
      expect(repo.qb.andWhere).not.toHaveBeenCalled();
      expect(repo.qb.skip).toHaveBeenCalledWith(5);
      expect(repo.qb.take).toHaveBeenCalledWith(5);
      expect(r.datos).toHaveLength(2);
      expect(r.datos[0]).not.toHaveProperty('contrasenaHash');
      expect(r.meta).toEqual({
        pagina: 2,
        limite: 5,
        total: 12,
        totalPaginas: 3,
        tieneAnterior: true,
        tieneSiguiente: true,
      });
    });

    it('aplica búsqueda, rol y estado', async () => {
      await servicio.listar({
        q: 'ana',
        rol: RolUsuario.DIRECTORA,
        activo: false,
        order: 'DESC',
        pagina: 1,
        limite: 10,
      } as never);

      expect(repo.qb.orderBy).toHaveBeenCalledWith('usuario.nombre', 'DESC');
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        { q: '%ana%' },
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith('usuario.rol = :rol', {
        rol: RolUsuario.DIRECTORA,
      });
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        'usuario.activo = :activo',
        { activo: false },
      );
    });

    it('activo=false se respeta (no se confunde con "sin filtro")', async () => {
      await servicio.listar({ activo: false, pagina: 1, limite: 10 } as never);
      expect(repo.qb.andWhere).toHaveBeenCalledTimes(1);
    });
  });

  describe('obtenerPorId (GET /usuarios/:id)', () => {
    it('devuelve el usuario mapeado', async () => {
      repo.findOne.mockResolvedValue(entidad());
      const r = await servicio.obtenerPorId('u-1');
      expect(r).toMatchObject({ id: 'u-1', rol: RolUsuario.ESTUDIANTE });
      expect(r).not.toHaveProperty('contrasenaHash');
    });

    it('404 si no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(servicio.obtenerPorId('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('actualizar (PATCH /usuarios/:id)', () => {
    const cambios = {
      nombre: ' Ana M ',
      correo: 'ana@ctp27.test',
      rol: RolUsuario.ESTUDIANTE,
      activo: true,
    };

    it('404 si el usuario no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        servicio.actualizar('x', cambios, ADMIN),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('actualiza datos, audita y NO toca rolAsignadoEn si el rol no cambia', async () => {
      const original = new Date('2026-01-01');
      repo.findOne.mockResolvedValue(entidad({ rolAsignadoEn: original }));

      const r = await servicio.actualizar('u-1', cambios, ADMIN);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Ana M',
          actualizadoPor: 'admin-1',
          rolAsignadoEn: original,
        }),
      );
      expect(repo.update).not.toHaveBeenCalled();
      expect(r.nombre).toBe('Ana M');
    });

    it('cambio de rol: registra rolAsignadoEn nuevo', async () => {
      const original = new Date('2026-01-01');
      repo.findOne.mockResolvedValue(entidad({ rolAsignadoEn: original }));

      await servicio.actualizar(
        'u-1',
        { ...cambios, rol: RolUsuario.DIRECTORA },
        ADMIN,
      );

      const guardado = repo.save.mock.calls[0][0] as {
        rol: string;
        rolAsignadoEn: Date;
      };
      expect(guardado.rol).toBe(RolUsuario.DIRECTORA);
      expect(guardado.rolAsignadoEn.getTime()).toBeGreaterThan(
        original.getTime(),
      );
    });

    it('con contraseña nueva: la persiste aparte (hash bcrypt) porque el campo es select:false', async () => {
      repo.findOne.mockResolvedValue(entidad());

      await servicio.actualizar(
        'u-1',
        { ...cambios, contrasena: 'NuevaClave1' },
        ADMIN,
      );

      const [id, datos] = repo.update.mock.calls[0] as [
        string,
        { contrasenaHash: string },
      ];
      expect(id).toBe('u-1');
      expect(await bcrypt.compare('NuevaClave1', datos.contrasenaHash)).toBe(
        true,
      );
    }, 15000);

    it('sin contraseña: no llama a update', async () => {
      repo.findOne.mockResolvedValue(entidad());
      await servicio.actualizar('u-1', cambios, ADMIN);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('correo nuevo ya usado por otro: 409', async () => {
      repo.findOne
        .mockResolvedValueOnce(entidad())
        .mockResolvedValueOnce(entidad({ id: 'otro' }));
      await expect(
        servicio.actualizar('u-1', { ...cambios, correo: 'otro@x.cr' }, ADMIN),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('mismo correo (aunque con mayúsculas) no cuenta como duplicado', async () => {
      repo.findOne.mockResolvedValue(entidad());
      await servicio.actualizar(
        'u-1',
        { ...cambios, correo: ' ANA@ctp27.test ' },
        ADMIN,
      );
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it('violación UNIQUE al guardar: 409', async () => {
      repo.findOne.mockResolvedValue(entidad());
      repo.save.mockRejectedValue(errorPg('23505'));
      await expect(
        servicio.actualizar('u-1', cambios, ADMIN),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    describe('salvaguardas de acceso administrativo', () => {
      const admin2 = entidad({ id: 'admin-2', rol: RolUsuario.ADMINISTRADOR });
      const baja = { nombre: 'Otro', correo: 'ana@ctp27.test' };

      it('un administrador no puede quitarse a sí mismo el rol', async () => {
        repo.findOne.mockResolvedValue(
          entidad({ id: 'admin-1', rol: RolUsuario.ADMINISTRADOR }),
        );
        await expect(
          servicio.actualizar(
            'admin-1',
            { ...baja, rol: RolUsuario.DIRECTORA, activo: true },
            ADMIN,
          ),
        ).rejects.toThrow('No puede cambiar su propio rol de administrador');
      });

      it('un administrador no puede desactivarse a sí mismo', async () => {
        repo.findOne.mockResolvedValue(
          entidad({ id: 'admin-1', rol: RolUsuario.ADMINISTRADOR }),
        );
        await expect(
          servicio.actualizar(
            'admin-1',
            { ...baja, rol: RolUsuario.ADMINISTRADOR, activo: false },
            ADMIN,
          ),
        ).rejects.toThrow('No puede desactivar su propia cuenta');
      });

      it('no se puede degradar al único administrador activo', async () => {
        repo.findOne.mockResolvedValue(admin2);
        repo.count.mockResolvedValue(1);
        await expect(
          servicio.actualizar(
            'admin-2',
            { ...baja, rol: RolUsuario.DOCENTE_AGRICOLA, activo: true },
            ADMIN,
          ),
        ).rejects.toThrow('único administrador activo');
        expect(repo.save).not.toHaveBeenCalled();
      });

      it('no se puede desactivar al único administrador activo (PATCH solo con activo=false)', async () => {
        repo.findOne.mockResolvedValue(admin2);
        repo.count.mockResolvedValue(1);
        await expect(
          servicio.actualizar(
            'admin-2',
            { ...baja, rol: RolUsuario.ADMINISTRADOR, activo: false },
            ADMIN,
          ),
        ).rejects.toThrow('No se puede desactivar al único administrador');
      });

      it('con otro administrador activo sí se permite degradar', async () => {
        repo.findOne.mockResolvedValue(admin2);
        repo.count.mockResolvedValue(2);
        await expect(
          servicio.actualizar(
            'admin-2',
            { ...baja, rol: RolUsuario.DIRECTORA, activo: true },
            ADMIN,
          ),
        ).resolves.toBeDefined();
        expect(repo.count).toHaveBeenCalledWith({
          where: { rol: RolUsuario.ADMINISTRADOR, activo: true },
        });
      });

      it('degradar a un administrador ya inactivo no consulta el conteo', async () => {
        repo.findOne.mockResolvedValue(
          entidad({
            id: 'admin-3',
            rol: RolUsuario.ADMINISTRADOR,
            activo: false,
          }),
        );
        await servicio.actualizar(
          'admin-3',
          { ...baja, rol: RolUsuario.DIRECTORA, activo: false },
          ADMIN,
        );
        expect(repo.count).not.toHaveBeenCalled();
      });

      it('cambios que no afectan al acceso admin no consultan el conteo', async () => {
        repo.findOne.mockResolvedValue(entidad());
        await servicio.actualizar('u-1', cambios, ADMIN);
        expect(repo.count).not.toHaveBeenCalled();
      });
    });
  });

  describe('desactivar (PATCH /usuarios/:id/desactivar)', () => {
    it('baja lógica: activo=false y auditoría del actor', async () => {
      repo.findOne.mockResolvedValue(entidad());
      const r = await servicio.desactivar('u-1', ADMIN);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ activo: false, actualizadoPor: 'admin-1' }),
      );
      expect(r.activo).toBe(false);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('404 si no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(servicio.desactivar('x', ADMIN)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('400 si ya estaba desactivado', async () => {
      repo.findOne.mockResolvedValue(entidad({ activo: false }));
      await expect(servicio.desactivar('u-1', ADMIN)).rejects.toThrow(
        new BadRequestException('El usuario ya está desactivado.'),
      );
    });

    it('no puede desactivarse a sí mismo', async () => {
      repo.findOne.mockResolvedValue(
        entidad({ id: 'admin-1', rol: RolUsuario.ADMINISTRADOR }),
      );
      await expect(servicio.desactivar('admin-1', ADMIN)).rejects.toThrow(
        'No puede desactivar su propia cuenta',
      );
    });

    it('no puede desactivar al único administrador activo', async () => {
      repo.findOne.mockResolvedValue(
        entidad({ id: 'admin-2', rol: RolUsuario.ADMINISTRADOR }),
      );
      repo.count.mockResolvedValue(1);
      await expect(servicio.desactivar('admin-2', ADMIN)).rejects.toThrow(
        'único administrador activo',
      );
    });
  });

  describe('actualizarPerfilPropio', () => {
    it('cambia nombre y correo del titular y no toca el rol', async () => {
      repo.findOne
        .mockResolvedValueOnce(entidad())
        .mockResolvedValueOnce(null);
      repo.save.mockImplementation((u: object) => Promise.resolve(u));

      const r = await servicio.actualizarPerfilPropio('u-1', {
        nombre: '  Ana Mora ',
        correo: ' ANA.MORA@ctp27.test ',
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Ana Mora',
          correo: 'ana.mora@ctp27.test',
          rol: RolUsuario.ESTUDIANTE,
          actualizadoPor: 'u-1',
        }),
      );
      expect(r.nombre).toBe('Ana Mora');
    });

    it('409 si el correo nuevo ya está en uso', async () => {
      repo.findOne
        .mockResolvedValueOnce(entidad())
        .mockResolvedValueOnce(entidad({ id: 'otro', correo: 'otra@x.cr' }));

      await expect(
        servicio.actualizarPerfilPropio('u-1', {
          nombre: 'Ana',
          correo: 'otra@x.cr',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('soporte de autenticación', () => {
    it('buscarParaAutenticar normaliza el correo y es el único que selecciona el hash', async () => {
      const qb = crearQueryBuilderSimulado({ getOne: entidad() });
      repo.createQueryBuilder.mockReturnValue(qb);

      const r = await servicio.buscarParaAutenticar('  ANA@ctp27.test ');

      expect(qb.addSelect).toHaveBeenCalledWith('usuario.contrasenaHash');
      expect(qb.where).toHaveBeenCalledWith('usuario.correo = :correo', {
        correo: 'ana@ctp27.test',
      });
      expect(r).toMatchObject({ id: 'u-1' });
    });

    it('buscarParaAutenticarPorId selecciona el hash por id', async () => {
      const qb = crearQueryBuilderSimulado({ getOne: entidad() });
      repo.createQueryBuilder.mockReturnValue(qb);

      await servicio.buscarParaAutenticarPorId('u-1');

      expect(qb.addSelect).toHaveBeenCalledWith('usuario.contrasenaHash');
      expect(qb.where).toHaveBeenCalledWith('usuario.id = :id', { id: 'u-1' });
    });

    it('buscarPorId consulta por id', async () => {
      repo.findOne.mockResolvedValue(entidad());
      await servicio.buscarPorId('u-1');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'u-1' } });
    });

    it('registrarUltimoAcceso actualiza la fecha', async () => {
      await servicio.registrarUltimoAcceso('u-1');
      expect(repo.update).toHaveBeenCalledWith('u-1', {
        ultimoAcceso: expect.any(Date),
      });
    });
  });
});
