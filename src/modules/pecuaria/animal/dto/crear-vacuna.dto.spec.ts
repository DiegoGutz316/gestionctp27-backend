import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CrearVacunaDto } from './crear-vacuna.dto';

describe('CrearVacunaDto', () => {
  it('rechaza el registro cuando los campos obligatorios están vacíos', () => {
    const dto = plainToInstance(CrearVacunaDto, {
      animalId: null,
      tipoVacuna: '   ',
      fecha: '',
      dosis: '   ',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(
      expect.arrayContaining(['animalId', 'tipoVacuna', 'fecha', 'dosis']),
    );
  });
});
