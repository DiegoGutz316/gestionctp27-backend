import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { fechaDeHoy } from '../../../common/validacion/fecha-no-futura.validator';
import { EditarAvisoDto } from './editar-aviso.dto';
import { CategoriaAviso } from '../enums/categoria-aviso.enum';
import { EstadoAviso } from '../enums/estado-aviso.enum';

function desplazarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const resultado = new Date(Date.UTC(anio, mes - 1, dia));
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado.toISOString().slice(0, 10);
}

const hoy = fechaDeHoy();

const datosValidos = {
  titulo: 'Feria agrícola institucional',
  descripcion: 'Se realizará la feria anual en el gimnasio del colegio.',
  fecha: desplazarDias(hoy, 7),
  categoria: CategoriaAviso.ACADEMICOS,
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

  it('admite la fecha de hoy', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      ...datosValidos,
      fecha: hoy,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('admite una fecha futura', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      ...datosValidos,
      fecha: desplazarDias(hoy, 30),
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rechaza una fecha anterior a hoy', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      ...datosValidos,
      fecha: desplazarDias(hoy, -1),
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['fecha']));
  });

  it('rechaza un estado que no pertenece al enum', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      ...datosValidos,
      estado: 'BORRADOR',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['estado']));
  });

  it('rechaza una categoría que no pertenece al catálogo', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      ...datosValidos,
      categoria: 'TODOS',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['categoria']));
  });

  it('exige la categoría', () => {
    const dto = plainToInstance(EditarAvisoDto, {
      titulo: datosValidos.titulo,
      descripcion: datosValidos.descripcion,
      fecha: datosValidos.fecha,
      estado: datosValidos.estado,
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['categoria']));
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
