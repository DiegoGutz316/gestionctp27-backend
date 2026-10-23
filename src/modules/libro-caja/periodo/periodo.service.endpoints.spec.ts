/**
 * Pruebas unitarias - PeriodoService: reglas de negocio de los endpoints de
 * /libro-caja/periodos (complementa periodo.service.spec.ts, que cubre la
 * apertura exitosa).
 *
 * Usa la LibroCajaPolicy real. DataSource/EntityManager simulados.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  crearQueryBuilderSimulado,
  crearRepositorioSimulado,
  type QueryBuilderSimulado,
} from '../../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { EstadoFondo } from './enums/estado-fondo.enum';
import { EstadoPeriodo } from './enums/estado-periodo.enum';
import { PeriodoService } from './periodo.service';

const usuario = (rol: RolUsuario) => ({
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol,
});
const admin = usuario(RolUsuario.ADMINISTRADOR);
const depto = (id: number) => ({
  id,
  nombreUnidad: `Unidad ${id}`,
  tipoActividad: 'T',
  activo: true,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
});
const periodoBase = (extra: Record<string, unknown> = {}) => ({
  id: 5,
  nombre: '2026-II',
  fechaInicio: '2026-07-01',
  fechaFin: '2026-12-31',
  estado: EstadoPeriodo.ABIERTO,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
  fondos: [],
  ...extra,
});
const fondoBase = (extra: Record<string, unknown> = {}) => ({
  id: 7,
  montoSolicitado: null,
  estado: EstadoFondo.PENDIENTE,
  solicitadoEn: null,
  departamento: depto(1),
  periodo: { id: 5 },
  pieInforme: null,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
  ...extra,
});
const apertura = {
  nombre: 'Nuevo',
  fechaInicio: '2027-01-01',
  fechaFin: '2027-06-30',
  fondos: [{ departamentoId: 1, monto: 100 }],
};

describe('PeriodoService - reglas de negocio', () => {
  let repo: ReturnType<typeof crearRepositorioSimulado>;
  let manager: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let builders: QueryBuilderSimulado[];
  let fondosRepo: ReturnType<typeof crearRepositorioSimulado>;
  let dataSource: { transaction: jest.Mock; getRepository: jest.Mock };
  let servicio: PeriodoService;

  beforeEach(() => {
    repo = crearRepositorioSimulado();
    fondosRepo = crearRepositorioSimulado();
    builders = [];
    manager = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((_c: unknown, d: object) => d),
      save: jest.fn((...args: unknown[]) =>
        Promise.resolve(args.length === 2 ? args[1] : args[0]),
      ),
      createQueryBuilder: jest.fn(
        () => builders.shift() ?? crearQueryBuilderSimulado(),
      ),
    };
    dataSource = {
      transaction: jest.fn((fn: (m: typeof manager) => unknown) => fn(manager)),
      getRepository: jest.fn(() => fondosRepo),
    };
    servicio = new PeriodoService(
      repo as never,
      dataSource as never,
      new LibroCajaPolicy(),
    );
  });

  describe('listar (GET)', () => {
    it('ordena por fecha de inicio descendente y mapea el resumen sin fondos', async () => {
      repo.qb.getManyAndCount.mockResolvedValue([[periodoBase()], 1]);
      const r = await servicio.listar({ pagina: 1, limite: 10 });
      expect(repo.qb.orderBy).toHaveBeenCalledWith(
        'periodo.fechaInicio',
        'DESC',
      );
      expect(r.datos[0]).not.toHaveProperty('fondos');
      expect(r.meta.total).toBe(1);
    });

    it('filtra por estado y por nombre', async () => {
      await servicio.listar({
        estado: EstadoPeriodo.CERRADO,
        q: '2026',
        pagina: 1,
        limite: 10,
      });
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        'periodo.estado = :estado',
        { estado: 'CERRADO' },
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        { q: '%2026%' },
      );
    });
  });

  describe('obtener (GET :id)', () => {
    it('devuelve el periodo con sus fondos', async () => {
      repo.qb.getOne.mockResolvedValue(periodoBase({ fondos: [fondoBase()] }));
      const r = await servicio.obtener(5);
      expect(r.fondos).toHaveLength(1);
      expect(r.fondos[0].departamento.nombreUnidad).toBe('Unidad 1');
    });

    it('404 si no existe', async () => {
      repo.qb.getOne.mockResolvedValue(null);
      await expect(servicio.obtener(5)).rejects.toThrow(
        new NotFoundException('El periodo no existe.'),
      );
    });
  });

  describe('abrir (POST)', () => {
    it('no administrador: 403 sin abrir transacción', async () => {
      await expect(
        servicio.abrir(apertura, usuario(RolUsuario.DOCENTE_AGRICOLA)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('409 si ya hay un periodo abierto', async () => {
      manager.findOne.mockResolvedValue({ nombre: 'Vigente' });
      await expect(servicio.abrir(apertura, admin)).rejects.toThrow(
        'Ya hay un periodo abierto ("Vigente")',
      );
    });

    it('409 si el rango se solapa con otro periodo', async () => {
      manager.findOne.mockResolvedValue(null);
      builders.push(
        crearQueryBuilderSimulado({
          getOne: {
            nombre: 'Previo',
            fechaInicio: '2026-12-01',
            fechaFin: '2027-02-01',
          },
        }),
      );
      await expect(servicio.abrir(apertura, admin)).rejects.toThrow(
        'Las fechas se solapan con el periodo "Previo"',
      );
    });

    it('400 si no hay departamentos activos', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.find.mockResolvedValue([]);
      await expect(servicio.abrir(apertura, admin)).rejects.toThrow(
        'No hay departamentos activos',
      );
    });

    it('400 si un departamento aparece dos veces', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.find.mockResolvedValue([depto(1)]);
      manager.save.mockResolvedValue({ id: 10 });
      await expect(
        servicio.abrir(
          {
            ...apertura,
            fondos: [
              { departamentoId: 1, monto: 1 },
              { departamentoId: 1, monto: 2 },
            ],
          },
          admin,
        ),
      ).rejects.toThrow('Cada departamento debe aparecer una sola vez.');
    });

    it('400 si falta el fondo de algún departamento activo', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.find.mockResolvedValue([depto(1), depto(2)]);
      manager.save.mockResolvedValue({ id: 10 });
      await expect(servicio.abrir(apertura, admin)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('400 si el fondo es de un departamento que no está activo', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.find.mockResolvedValue([depto(1)]);
      manager.save.mockResolvedValue({ id: 10 });
      await expect(
        servicio.abrir(
          {
            ...apertura,
            fondos: [
              { departamentoId: 1, monto: 1 },
              { departamentoId: 99, monto: 1 },
            ],
          },
          admin,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('actualizar (PATCH :id)', () => {
    const edicion = {
      nombre: 'Editado',
      fechaInicio: '2026-07-01',
      fechaFin: '2026-12-15',
    };

    it('edita un periodo abierto y devuelve el periodo recargado', async () => {
      const p = periodoBase();
      manager.findOne.mockResolvedValue(p);
      repo.qb.getOne.mockResolvedValue(periodoBase({ nombre: 'Editado' }));

      const r = await servicio.actualizar(5, edicion, admin);

      expect(p).toMatchObject({
        nombre: 'Editado',
        fechaFin: '2026-12-15',
        actualizadoPor: 'u-1',
      });
      expect(r.nombre).toBe('Editado');
    });

    it('revisa solapamiento excluyendo al propio periodo', async () => {
      manager.findOne.mockResolvedValue(periodoBase());
      const solape = crearQueryBuilderSimulado();
      builders.push(solape);
      repo.qb.getOne.mockResolvedValue(periodoBase());
      await servicio.actualizar(5, edicion, admin);
      expect(solape.andWhere).toHaveBeenCalledWith(
        'periodo.id != :idExcluido',
        { idExcluido: 5 },
      );
    });

    it('404 si no existe', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(
        servicio.actualizar(5, edicion, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('409 si el periodo está cerrado', async () => {
      manager.findOne.mockResolvedValue(
        periodoBase({ estado: EstadoPeriodo.CERRADO }),
      );
      await expect(servicio.actualizar(5, edicion, admin)).rejects.toThrow(
        'Solo se pueden editar los datos de un periodo abierto.',
      );
    });

    it('409 si el nuevo rango se solapa con otro periodo', async () => {
      manager.findOne.mockResolvedValue(periodoBase());
      builders.push(
        crearQueryBuilderSimulado({
          getOne: { nombre: 'Otro', fechaInicio: 'a', fechaFin: 'b' },
        }),
      );
      await expect(
        servicio.actualizar(5, edicion, admin),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('400 si hay asientos con fecha fuera del nuevo rango', async () => {
      manager.findOne.mockResolvedValue(periodoBase());
      builders.push(
        crearQueryBuilderSimulado({ getOne: null }),
        crearQueryBuilderSimulado({ getCount: 3 }),
      );
      await expect(servicio.actualizar(5, edicion, admin)).rejects.toThrow(
        'hay asientos con fecha fuera',
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('no administrador: 403', async () => {
      await expect(
        servicio.actualizar(5, edicion, usuario(RolUsuario.DIRECTORA)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('cerrar (POST :id/cerrar)', () => {
    it('cierra un periodo abierto', async () => {
      const p = periodoBase();
      manager.findOne.mockResolvedValue(p);
      repo.qb.getOne.mockResolvedValue(
        periodoBase({ estado: EstadoPeriodo.CERRADO }),
      );

      const r = await servicio.cerrar(5, admin);

      expect(p).toMatchObject({
        estado: EstadoPeriodo.CERRADO,
        actualizadoPor: 'u-1',
      });
      expect(r.estado).toBe(EstadoPeriodo.CERRADO);
    });

    it('404 si no existe', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(servicio.cerrar(5, admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('409 si ya estaba cerrado', async () => {
      manager.findOne.mockResolvedValue(
        periodoBase({ estado: EstadoPeriodo.CERRADO }),
      );
      await expect(servicio.cerrar(5, admin)).rejects.toThrow(
        new ConflictException('El periodo ya está cerrado.'),
      );
    });

    it.each([
      RolUsuario.DOCENTE_AGRICOLA,
      RolUsuario.DOCENTE_PECUARIO,
      RolUsuario.DIRECTORA,
      RolUsuario.ESTUDIANTE,
    ])('%s: 403', async (rol) => {
      await expect(servicio.cerrar(5, usuario(rol))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('solicitarFondo (POST :id/fondos/:fondoId/solicitar)', () => {
    const docente = usuario(RolUsuario.DOCENTE_PECUARIO);

    it('solicita el fondo pendiente: monto, estado, fecha y solicitante', async () => {
      const f = fondoBase();
      manager.findOne
        .mockResolvedValueOnce(periodoBase())
        .mockResolvedValueOnce(f);

      const r = await servicio.solicitarFondo(
        5,
        7,
        { montoSolicitado: 50000 },
        docente,
      );

      expect(f).toMatchObject({
        montoSolicitado: 50000,
        estado: EstadoFondo.SOLICITADO,
        solicitadoPor: 'u-1',
      });
      expect(f.solicitadoEn).toBeInstanceOf(Date);
      expect(r).toMatchObject({
        montoSolicitado: 50000,
        estado: EstadoFondo.SOLICITADO,
      });
    });

    it('404 si el periodo no existe', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(
        servicio.solicitarFondo(5, 7, { montoSolicitado: 1 }, docente),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('409 si el periodo está cerrado', async () => {
      manager.findOne.mockResolvedValue(
        periodoBase({ estado: EstadoPeriodo.CERRADO }),
      );
      await expect(
        servicio.solicitarFondo(5, 7, { montoSolicitado: 1 }, docente),
      ).rejects.toThrow('periodo cerrado');
    });

    it('404 si el fondo no existe o pertenece a otro periodo', async () => {
      manager.findOne
        .mockResolvedValueOnce(periodoBase())
        .mockResolvedValueOnce(fondoBase({ periodo: { id: 99 } }));
      await expect(
        servicio.solicitarFondo(5, 7, { montoSolicitado: 1 }, docente),
      ).rejects.toThrow('El fondo de caja no existe en este periodo.');
    });

    it('409 si el fondo ya fue solicitado', async () => {
      manager.findOne
        .mockResolvedValueOnce(periodoBase())
        .mockResolvedValueOnce(fondoBase({ estado: EstadoFondo.SOLICITADO }));
      await expect(
        servicio.solicitarFondo(5, 7, { montoSolicitado: 1 }, docente),
      ).rejects.toThrow('ya solicitó su fondo');
    });

    it.each([RolUsuario.DIRECTORA, RolUsuario.ESTUDIANTE])(
      '%s: 403 (solo docentes y administrador)',
      async (rol) => {
        manager.findOne
          .mockResolvedValueOnce(periodoBase())
          .mockResolvedValueOnce(fondoBase());
        await expect(
          servicio.solicitarFondo(5, 7, { montoSolicitado: 1 }, usuario(rol)),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(manager.save).not.toHaveBeenCalled();
      },
    );
  });

  describe('guardarPieInforme (PATCH :id/fondos/:fondoId/informe)', () => {
    const pie = {
      observaciones: ['uno', 'dos'] as unknown as [string, string, string],
      director: 'D',
      presidente: 'P',
      tesorera: 'T',
      firmaDirector: 'fd',
      firmaPresidente: 'fp',
      firmaTesorera: 'ft',
      coordinador: 'C',
    };

    it.each([
      RolUsuario.ADMINISTRADOR,
      RolUsuario.DIRECTORA,
      RolUsuario.DOCENTE_AGRICOLA,
      RolUsuario.DOCENTE_PECUARIO,
    ])(
      '%s guarda el pie; observaciones faltantes se rellenan con cadena vacía',
      async (rol) => {
        fondosRepo.findOne.mockResolvedValue(fondoBase());
        fondosRepo.save.mockImplementation((f: object) => Promise.resolve(f));

        const r = await servicio.guardarPieInforme(5, 7, pie, usuario(rol));

        expect(r.pieInforme).toEqual({
          observaciones: ['uno', 'dos', ''],
          director: 'D',
          presidente: 'P',
          tesorera: 'T',
          firmaDirector: 'fd',
          firmaPresidente: 'fp',
          firmaTesorera: 'ft',
          coordinador: 'C',
        });
      },
    );

    it('estudiante: 403 sin consultar el fondo', async () => {
      await expect(
        servicio.guardarPieInforme(5, 7, pie, usuario(RolUsuario.ESTUDIANTE)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(fondosRepo.findOne).not.toHaveBeenCalled();
    });

    it('404 si el fondo no existe o es de otro periodo', async () => {
      fondosRepo.findOne.mockResolvedValue(fondoBase({ periodo: { id: 99 } }));
      await expect(
        servicio.guardarPieInforme(5, 7, pie, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
      fondosRepo.findOne.mockResolvedValue(null);
      await expect(
        servicio.guardarPieInforme(5, 7, pie, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(fondosRepo.save).not.toHaveBeenCalled();
    });
  });
});
