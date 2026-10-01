import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MovimientoStock } from '../../inventario/stock/entities/movimiento-stock.entity';
import { TipoMovimiento } from '../../inventario/stock/enums/tipo-movimiento.enum';

import { ConsultarReporteInventarioDto } from './dto/consultar-reporte-inventario.dto';
import {
  mapearReporteInventario,
  type FilaReporteInventario,
  type ReporteInventarioRespuesta,
} from './respuestas/reporte-inventario.mapper';

@Injectable()
export class ReporteInventarioService {
  constructor(
    @InjectRepository(MovimientoStock)
    private readonly movimientosRepo: Repository<MovimientoStock>,
  ) {}

  async generar(
    dto: ConsultarReporteInventarioDto,
  ): Promise<ReporteInventarioRespuesta> {
    const consulta = this.movimientosRepo
      .createQueryBuilder('movimiento')
      .innerJoin('movimiento.inventario', 'inventario')
      .innerJoin('inventario.producto', 'producto')
      .where('movimiento.fecha <= :fechaFin', {
        fechaFin: dto.fechaFin,
      });

    if (dto.productoId) {
      consulta.andWhere('producto.id = :productoId', {
        productoId: dto.productoId,
      });
    }

    if (dto.tipoProducto) {
      consulta.andWhere('producto.tipoProducto = :tipoProducto', {
        tipoProducto: dto.tipoProducto,
      });
    }

    const filas = await consulta
      .select('inventario.id', 'inventarioId')
      .addSelect('producto.id', 'productoId')
      .addSelect('producto.nombre', 'producto')
      .addSelect('producto.tipoProducto', 'categoria')
      .addSelect('producto.unidadMedida', 'unidadMedida')
      .addSelect(
        `
          COALESCE(
            SUM(
              CASE
                WHEN movimiento.fecha >= :fechaInicio
                  AND movimiento.fecha <= :fechaFin
                  AND movimiento.tipo = :entrada
                THEN movimiento.cantidad
                ELSE 0
              END
            ),
            0
          )
          `,
        'entradas',
      )
      .addSelect(
        `
          COALESCE(
            SUM(
              CASE
                WHEN movimiento.fecha >= :fechaInicio
                  AND movimiento.fecha <= :fechaFin
                  AND movimiento.tipo = :salida
                THEN movimiento.cantidad
                ELSE 0
              END
            ),
            0
          )
          `,
        'salidas',
      )
      .addSelect(
        `
          COALESCE(
            SUM(
              CASE
                WHEN movimiento.tipo = :salida
                  THEN -movimiento.cantidad
                ELSE movimiento.cantidad
              END
            ),
            0
          )
          `,
        'existenciaFinal',
      )
      .addSelect('inventario.cantidadActual', 'saldoActual')
      .setParameters({
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
        entrada: TipoMovimiento.ENTRADA,
        salida: TipoMovimiento.SALIDA,
      })
      .groupBy('inventario.id')
      .addGroupBy('producto.id')
      .addGroupBy('producto.nombre')
      .addGroupBy('producto.tipoProducto')
      .addGroupBy('producto.unidadMedida')
      .addGroupBy('inventario.cantidadActual')
      .having(
        `
          SUM(
            CASE
              WHEN movimiento.fecha >= :fechaInicio
                AND movimiento.fecha <= :fechaFin
              THEN 1
              ELSE 0
            END
          ) > 0
          `,
      )
      .orderBy('producto.nombre', 'ASC')
      .addOrderBy('producto.id', 'ASC')
      .getRawMany<FilaReporteInventario>();

    return mapearReporteInventario(dto.fechaInicio, dto.fechaFin, filas);
  }
}
