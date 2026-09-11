import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CrearDesparasitacionDto } from './crear-desparasitacion.dto';

describe('CrearDesparasitacionDto', () => {
  it('rechaza el registro cuando los campos obligatorios están vacíos', () => {
    const dto = plainToInstance(CrearDesparasitacionDto, {
      animalId: null,
      producto: '   ',
      fecha: '',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(
      expect.arrayContaining(['animalId', 'producto', 'fecha']),
    );
  });
});
