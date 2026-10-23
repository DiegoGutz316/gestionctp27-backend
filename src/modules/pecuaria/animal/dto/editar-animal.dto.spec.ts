import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { EspecieAnimal } from '../enums/especie-animal.enum';
import { EstadoAnimal } from '../enums/estado-animal.enum';
import { EditarAnimalDto } from './editar-animal.dto';

const MENSAJE_FUTURA = 'La fecha de nacimiento no puede ser futura';
const MENSAJE_FORMATO =
  'La fecha de nacimiento debe tener un formato de fecha válido';

function erroresDeFechaNacimiento(fechaNacimiento: string): string[] {
  const dto = plainToInstance(EditarAnimalDto, {
    codigo: 'CHA-001',
    nombre: 'Luna',
    especie: EspecieAnimal.CHANCHO,
    raza: 'Landrace',
    fechaNacimiento,
    estado: EstadoAnimal.ACTIVO,
  });

  const error = validateSync(dto).find(
    (error) => error.property === 'fechaNacimiento',
  );

  return Object.values(error?.constraints ?? {});
}

describe('EditarAnimalDto - fechaNacimiento', () => {
  beforeEach(() => {
    // 12:00 del 23 de octubre de 2026 en Costa Rica (UTC-6).
    jest.useFakeTimers().setSystemTime(new Date('2026-10-23T18:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rechaza una fecha de mañana', () => {
    expect(erroresDeFechaNacimiento('2026-10-24')).toContain(MENSAJE_FUTURA);
  });

  it('acepta la fecha de hoy', () => {
    expect(erroresDeFechaNacimiento('2026-10-23')).toHaveLength(0);
  });

  it('acepta la fecha de ayer', () => {
    expect(erroresDeFechaNacimiento('2026-10-22')).toHaveLength(0);
  });

  it('acepta la fecha de hoy en Costa Rica a las 19:00, cuando en UTC ya es el día siguiente', () => {
    jest.setSystemTime(new Date('2026-10-24T01:00:00.000Z'));

    expect(erroresDeFechaNacimiento('2026-10-23')).toHaveLength(0);
  });

  it('rechaza una fecha inexistente con el mensaje de formato', () => {
    expect(erroresDeFechaNacimiento('2026-02-31')).toContain(MENSAJE_FORMATO);
  });

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(erroresDeFechaNacimiento('2024-02-29')).toHaveLength(0);
  });
});
