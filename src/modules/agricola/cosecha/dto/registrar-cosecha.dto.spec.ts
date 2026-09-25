import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { UnidadMedida } from '../enums/unidad-medida.enum';
import { RegistrarCosechaDto } from './registrar-cosecha.dto';

const opciones = { whitelist: true, forbidNonWhitelisted: true };

function alta(extra: Record<string, unknown> = {}) {
  return plainToInstance(RegistrarCosechaDto, {
    siembraId: 1,
    fecha: '2026-09-25',
    cantidadObtenida: 12.5,
    unidadMedida: UnidadMedida.KG,
    ...extra,
  });
}

describe('RegistrarCosechaDto', () => {
  it('acepta el alta que envía el formulario, con cerrarCiclo en falso', () => {
    const dto = alta({ cerrarCiclo: false, observaciones: '' });

    expect(validateSync(dto, opciones)).toHaveLength(0);
    expect(dto.cerrarCiclo).toBe(false);
    expect(dto.observaciones).toBeUndefined();
  });

  it('acepta cerrar el ciclo junto con la cosecha', () => {
    const dto = alta({ cerrarCiclo: true });

    expect(validateSync(dto, opciones)).toHaveLength(0);
    expect(dto.cerrarCiclo).toBe(true);
  });

  it('rechaza un cierre de ciclo que no es booleano', () => {
    const dto = alta({ cerrarCiclo: 'si' });

    const camposInvalidos = validateSync(dto, opciones).map(
      (error) => error.property,
    );

    expect(camposInvalidos).toEqual(expect.arrayContaining(['cerrarCiclo']));
  });
});
