import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CrearInsumoDto } from './crear-insumo.dto';
import { FiltrarInsumosDto } from './filtrar-insumos.dto';
import { UnidadMedida } from '../enums/unidad-medida.enum';

describe('DTOs de inventario', () => {
  it('convierte los números enviados como texto', () => {
    const dto = plainToInstance(CrearInsumoDto, {
      nombre: '  Alimento concentrado ',
      categoriaId: '2',
      unidadMedida: UnidadMedida.KILOGRAMO,
      cantidad: '12.5',
      nivelMinimo: '0',
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.nombre).toBe('Alimento concentrado');
    expect(dto.categoriaId).toBe(2);
    expect(dto.cantidad).toBe(12.5);
    expect(dto.nivelMinimo).toBe(0);
  });

  it('rechaza campos numéricos vacíos', () => {
    const dto = plainToInstance(CrearInsumoDto, {
      nombre: 'Alimento concentrado',
      categoriaId: '',
      unidadMedida: UnidadMedida.KILOGRAMO,
      cantidad: '',
      nivelMinimo: '',
    });

    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('permite filtros ausentes y convierte categoriaId', () => {
    expect(validateSync(plainToInstance(FiltrarInsumosDto, {}))).toHaveLength(
      0,
    );

    const dto = plainToInstance(FiltrarInsumosDto, { categoriaId: '3' });
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.categoriaId).toBe(3);
  });
});
