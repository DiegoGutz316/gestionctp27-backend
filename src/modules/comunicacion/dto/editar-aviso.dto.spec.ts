import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { EditarAvisoDto } from './editar-aviso.dto';
import { EstadoAviso } from '../enums/estado-aviso.enum';

const datosValidos = {
  titulo: 'Feria agrícola institucional',
  descripcion: 'Se realizará la feria anual en el gimnasio del colegio.',
  fecha: '2026-11-15',
  estado: EstadoAviso.ACTIVO,
};

describe('EditarAvisoDto', () => {
  it('acepta título, descripción, fecha y estado válidos', () => {
    const dto = plainToInstance(EditarAvisoDto, datosValidos);

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('recorta los espacios del título y la descripción', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      ...datosValidos,
      titulo: '  Feria  ',
      descripcion: '  En el gimnasio  ',
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.titulo).toBe('Feria');
    expect(dto.descripcion).toBe('En el gimnasio');
  });

  it('rechaza el título vacío', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      ...datosValidos,
      titulo: '   ',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['titulo']));
  });

  it('rechaza una fecha que no existe en el calendario', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      ...datosValidos,
      fecha: '2026-02-31',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['fecha']));
  });

  it('admite una fecha futura', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      ...datosValidos,
      fecha: '2027-01-10',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rechaza un estado que no pertenece al enum', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      ...datosValidos,
      estado: 'BORRADOR',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['estado']));
  });

  it('exige el estado', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      titulo: datosValidos.titulo,
      descripcion: datosValidos.descripcion,
      fecha: datosValidos.fecha,
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['estado']));
  });
});
