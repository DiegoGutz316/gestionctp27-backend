import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CrearCamaCultivoDto } from './crear-cama-cultivo.dto';
import { EstadoCamaCultivo } from '../enums/estado-cama-cultivo.enum';

describe('CrearCamaCultivoDto', () => {
  it('rechaza el registro cuando los campos obligatorios están vacíos', () => {
    const dto = plainToInstance(CrearCamaCultivoDto, {
      codigo: '   ',
      ubicacion: '   ',
      estado: '',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(
      expect.arrayContaining(['codigo', 'ubicacion']),
    );
  });

  it('rechaza un código vacío', () => {
    const dto = plainToInstance(CrearCamaCultivoDto, {
      codigo: '   ',
      ubicacion: 'Invernadero 1',
      estado: EstadoCamaCultivo.DISPONIBLE,
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['codigo']));
  });

  it('rechaza un código que supere 50 caracteres', () => {
    const dto = plainToInstance(CrearCamaCultivoDto, {
      codigo: 'C'.repeat(51),
      ubicacion: 'Invernadero 1',
      estado: EstadoCamaCultivo.DISPONIBLE,
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['codigo']));
  });

  it('normaliza el código recortando espacios', () => {
    const dto = plainToInstance(CrearCamaCultivoDto, {
      codigo: '  CAMA-001  ',
      ubicacion: 'Invernadero 1',
      estado: EstadoCamaCultivo.DISPONIBLE,
    });

    expect(dto.codigo).toBe('CAMA-001');
  });

  it('no exige el estado: una cama nueva queda disponible en el servicio', () => {
    const dto = plainToInstance(CrearCamaCultivoDto, {
      codigo: 'CAMA-001',
      ubicacion: 'Invernadero 1',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('permite registrar sin estado: el alta del formulario no lo envía', () => {
    const dto = plainToInstance(CrearCamaCultivoDto, {
      codigo: 'CAMA-001',
      ubicacion: 'Invernadero 1',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('permite registrar sin observaciones', () => {
    const dto = plainToInstance(CrearCamaCultivoDto, {
      codigo: 'CAMA-001',
      ubicacion: 'Invernadero 1',
      estado: EstadoCamaCultivo.DISPONIBLE,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });
});
