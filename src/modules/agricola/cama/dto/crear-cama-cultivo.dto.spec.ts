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
      expect.arrayContaining(['codigo', 'ubicacion', 'estado']),
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

  it('rechaza un estado que no pertenece al enum', () => {
    const dto = plainToInstance(CrearCamaCultivoDto, {
      codigo: 'CAMA-001',
      ubicacion: 'Invernadero 1',
      estado: 'DESTRUIDA',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['estado']));
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
