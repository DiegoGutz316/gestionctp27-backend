import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CondicionSalud } from '../enums/condicion-salud.enum';
import { RegistrarSaludDto } from './registrar-salud.dto';

describe('RegistrarSaludDto', () => {
  it('acepta fecha, condición, diagnóstico y observaciones', () => {
    const dto = plainToInstance(RegistrarSaludDto, {
      animalId: '1',
      fecha: '2026-09-10',
      condicionObservada: CondicionSalud.ENFERMO,
      diagnostico: '  Mastitis  ',
      observaciones: '  Iniciar tratamiento  ',
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.animalId).toBe(1);
    expect(dto.diagnostico).toBe('Mastitis');
    expect(dto.observaciones).toBe('Iniciar tratamiento');
  });

  it('rechaza animal, fecha y condición vacíos', () => {
    const dto = plainToInstance(RegistrarSaludDto, {
      animalId: '',
      fecha: '',
      condicionObservada: '',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(
      expect.arrayContaining(['animalId', 'fecha', 'condicionObservada']),
    );
  });
});
