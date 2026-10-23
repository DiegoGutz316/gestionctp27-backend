import type { Repository } from 'typeorm';

import { MovimientoStock } from '../../inventario/stock/entities/movimiento-stock.entity';
import { TipoMovimiento } from '../../inventario/stock/enums/tipo-movimiento.enum';
import { TipoProducto } from '../../inventario/producto/enums/tipo-producto.enum';
import { UnidadMedida } from '../../inventario/producto/enums/unidad-medida.enum';

import { ConsultarReporteInventarioDto } from './dto/consultar-reporte-inventario.dto';
import { ReporteInventarioService } from './reporte-inventario.service';
import type { FilaReporteInventario } from './respuestas/reporte-inventario.mapper';

describe('ReporteInventarioService', () => {
  const dto: ConsultarReporteInventarioDto = {
    fechaInicio: '2026-09-01',
    fechaFin: '2026-09-30',
  };

  /**
   * Postgres devuelve `numeric` y los `SUM` como texto, asi que el mapper
   * tiene que convertirlos. Las filas de prueba imitan eso.
   */
  const fila = (
    valores: Partial<FilaReporteInventario> = {},
  ): FilaReporteInventario => ({
    inventarioId: '1',
    productoId: '10',
    producto: 'Abono orgánico',
    categoria: TipoProducto.INSUMO,
    unidadMedida: UnidadMedida.Kilogramo,
    entradas: '0',
    salidas: '0',
    existenciaFinal: '0',
    saldoActual: '0',
    ...valores,
  });

  describe('rango de fechas', () => {
    it('acota la consulta con la fecha final', async () => {
      const { service, consulta } = crearServicio([]);

      await service.generar(dto);

      expect(consulta.where).toHaveBeenCalledWith(
        'movimiento.fecha <= :fechaFin',
        { fechaFin: '2026-09-30' },
      );
    });

    it('pasa las dos fechas del rango como parámetros', async () => {
      const { service, consulta } = crearServicio([]);

      await service.generar(dto);

      expect(consulta.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          fechaInicio: '2026-09-01',
          fechaFin: '2026-09-30',
        }),
      );
    });

    it('distingue entradas de salidas por tipo de movimiento', async () => {
      const { service, consulta } = crearServicio([]);

      await service.generar(dto);

      expect(consulta.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          entrada: TipoMovimiento.ENTRADA,
          salida: TipoMovimiento.SALIDA,
        }),
      );
    });

    it('deja fuera los productos sin movimientos dentro del período', async () => {
      const { service, consulta } = crearServicio([]);

      await service.generar(dto);

      // El saldo acumulado necesita el historial completo hasta `fechaFin`,
      // asi que el recorte del período va en el HAVING y no en el WHERE.
      expect(consulta.having).toHaveBeenCalled();
    });

    it('devuelve las fechas del reporte tal como se pidieron', async () => {
      const { service } = crearServicio([]);

      const resultado = await service.generar(dto);

      expect(resultado.fechaInicio).toBe('2026-09-01');
      expect(resultado.fechaFin).toBe('2026-09-30');
    });
  });

  describe('filtros opcionales', () => {
    it('sin filtros no agrega condiciones de producto ni categoría', async () => {
      const { service, consulta } = crearServicio([]);

      await service.generar(dto);

      expect(consulta.andWhere).not.toHaveBeenCalled();
    });

    it('filtra por producto cuando viene productoId', async () => {
      const { service, consulta } = crearServicio([]);

      await service.generar({ ...dto, productoId: 10 });

      expect(consulta.andWhere).toHaveBeenCalledWith(
        'producto.id = :productoId',
        {
          productoId: 10,
        },
      );
    });

    it('filtra por categoría cuando viene tipoProducto', async () => {
      const { service, consulta } = crearServicio([]);

      await service.generar({ ...dto, tipoProducto: TipoProducto.INSUMO });

      expect(consulta.andWhere).toHaveBeenCalledWith(
        'producto.tipoProducto = :tipoProducto',
        { tipoProducto: TipoProducto.INSUMO },
      );
    });

    it('combina los dos filtros', async () => {
      const { service, consulta } = crearServicio([]);

      await service.generar({
        ...dto,
        productoId: 10,
        tipoProducto: TipoProducto.INSUMO,
      });

      expect(consulta.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('resultados', () => {
    it('devuelve una lista vacía cuando no hay movimientos en el período', async () => {
      const { service } = crearServicio([]);

      const resultado = await service.generar(dto);

      expect(resultado.registros).toEqual([]);
    });

    it('convierte a número las columnas que Postgres devuelve como texto', async () => {
      const { service } = crearServicio([
        fila({
          entradas: '120.50',
          salidas: '20.25',
          existenciaFinal: '100.25',
          saldoActual: '100.25',
        }),
      ]);

      const resultado = await service.generar(dto);

      expect(resultado.registros[0]).toMatchObject({
        inventarioId: 1,
        productoId: 10,
        entradas: 120.5,
        salidas: 20.25,
        existenciaFinal: 100.25,
        saldoActual: 100.25,
      });
    });

    it('ordena por nombre de producto y desempata por id', async () => {
      const { service, consulta } = crearServicio([]);

      await service.generar(dto);

      expect(consulta.orderBy).toHaveBeenCalledWith('producto.nombre', 'ASC');
      expect(consulta.addOrderBy).toHaveBeenCalledWith('producto.id', 'ASC');
    });
  });

  describe('saldo acumulado', () => {
    it('conserva un saldo negativo cuando las salidas superan a las entradas', async () => {
      const { service } = crearServicio([
        fila({
          entradas: '5',
          salidas: '30',
          existenciaFinal: '-25',
          saldoActual: '-25',
        }),
      ]);

      const resultado = await service.generar(dto);

      // No se recorta a cero: un negativo delata un inventario mal cuadrado y
      // esconderlo haria que el reporte dejara de servir para detectarlo.
      expect(resultado.registros[0].existenciaFinal).toBe(-25);
    });

    it('conserva un ajuste negativo en la existencia final', async () => {
      const { service } = crearServicio([
        fila({
          entradas: '100',
          salidas: '0',
          existenciaFinal: '-10',
          saldoActual: '-10',
        }),
      ]);

      const resultado = await service.generar(dto);

      // Un AJUSTE llega con su signo y resta sin ser una salida: entradas y
      // existencia final no tienen por qué coincidir.
      expect(resultado.registros[0].entradas).toBe(100);
      expect(resultado.registros[0].existenciaFinal).toBe(-10);
    });

    it('mantiene separados el acumulado del período y el saldo actual', async () => {
      const { service } = crearServicio([
        fila({
          entradas: '40',
          salidas: '10',
          existenciaFinal: '30',
          saldoActual: '55',
        }),
      ]);

      const resultado = await service.generar(dto);

      // `existenciaFinal` suma el historial hasta `fechaFin`; `saldoActual` es
      // lo que hay hoy en el inventario. Confundirlos invalidaría el reporte.
      expect(resultado.registros[0].existenciaFinal).toBe(30);
      expect(resultado.registros[0].saldoActual).toBe(55);
    });

    it('devuelve cero y no nulo cuando un producto no tuvo movimientos de un tipo', async () => {
      const { service } = crearServicio([
        fila({
          entradas: '0',
          salidas: '15',
          existenciaFinal: '-15',
          saldoActual: '0',
        }),
      ]);

      const resultado = await service.generar(dto);

      expect(resultado.registros[0].entradas).toBe(0);
      expect(resultado.registros[0].salidas).toBe(15);
    });
  });
});

function crearServicio(filas: FilaReporteInventario[]) {
  const consulta = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(filas),
  };

  const movimientosRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(consulta),
  };

  const service = new ReporteInventarioService(
    movimientosRepo as unknown as Repository<MovimientoStock>,
  );

  return { service, consulta };
}
