import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { EditarCamaCultivoDto } from './editar-cama-cultivo.dto';
import { EstadoCamaCultivo } from '../enums/estado-cama-cultivo.enum';

describe('EditarCamaCultivoDto', () => {
  it('acepta código, ubicación y estado válidos', () => {
    const dto = plainToInstance(EditarCamaCultivoDto, {
      codigo: 'CAMA-001',
      ubicacion: 'Invernadero 2',
      estado: EstadoCamaCultivo.SEMBRADA,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rechaza el código vacío', () => {
    const dto = plainToInstance(EditarCamaCultivoDto, {
      codigo: '   ',
      ubicacion: 'Invernadero 2',
      estado: EstadoCamaCultivo.SEMBRADA,
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['codigo']));
  });

  it('rechaza un código que supere 50 caracteres', () => {
    const dto = plainToInstance(EditarCamaCultivoDto, {
      codigo: 'C'.repeat(51),
      ubicacion: 'Invernadero 2',
      estado: EstadoCamaCultivo.SEMBRADA,
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['codigo']));
  });

  it('rechaza la ubicación vacía', () => {
    const dto = plainToInstance(EditarCamaCultivoDto, {
      codigo: 'CAMA-001',
      ubicacion: '   ',
      estado: EstadoCamaCultivo.SEMBRADA,
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['ubicacion']));
  });

  it('rechaza un estado que no pertenece al enum', () => {
    const dto = plainToInstance(EditarCamaCultivoDto, {
      codigo: 'CAMA-001',
      ubicacion: 'Invernadero 2',
      estado: 'DESTRUIDA',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['estado']));
  });

  it('permite observaciones opcionales', () => {
    const dto = plainToInstance(EditarCamaCultivoDto, {
      codigo: 'CAMA-001',
      ubicacion: 'Invernadero 2',
      estado: EstadoCamaCultivo.MANTENIMIENTO,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('normaliza el texto de código, ubicación y observaciones recortando espacios', () => {
    const dto = plainToInstance(EditarCamaCultivoDto, {
      codigo: '  CAMA-001  ',
      ubicacion: '  Invernadero 2  ',
      estado: EstadoCamaCultivo.SEMBRADA,
      observaciones: '  Riego revisado.  ',
    });

    expect(dto.codigo).toBe('CAMA-001');
    expect(dto.ubicacion).toBe('Invernadero 2');
    expect(dto.observaciones).toBe('Riego revisado.');
  });
});
