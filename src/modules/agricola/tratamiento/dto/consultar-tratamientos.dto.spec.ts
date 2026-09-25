import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { TipoTratamiento } from '../enums/tipo-tratamiento.enum';
import { ConsultarTratamientosDto } from './consultar-tratamientos.dto';

const opciones = { whitelist: true, forbidNonWhitelisted: true };

describe('ConsultarTratamientosDto', () => {
  it('acepta el listado sin filtros que abre la pantalla', () => {
    const dto = plainToInstance(ConsultarTratamientosDto, {});

    expect(validateSync(dto, opciones)).toHaveLength(0);
  });

  it('acepta ubicación, cama y tipo', () => {
    const dto = plainToInstance(ConsultarTratamientosDto, {
      ubicacion: 'Invernadero 1',
      camaId: '3',
      tipo: TipoTratamiento.FERTILIZANTE,
    });

    expect(validateSync(dto, opciones)).toHaveLength(0);
    expect(dto.camaId).toBe(3);
  });

  it('rechaza un tipo que no existe', () => {
    const dto = plainToInstance(ConsultarTratamientosDto, {
      tipo: 'ABONO',
    });

    const camposInvalidos = validateSync(dto, opciones).map(
      (error) => error.property,
    );

    expect(camposInvalidos).toEqual(expect.arrayContaining(['tipo']));
  });
});
