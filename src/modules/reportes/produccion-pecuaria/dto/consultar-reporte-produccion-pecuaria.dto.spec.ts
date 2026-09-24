import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ConsultarReporteProduccionPecuariaDto } from './consultar-reporte-produccion-pecuaria.dto';

describe('ConsultarReporteProduccionPecuariaDto', () => {
  it('acepta un animal y un rango de fechas válido', () => {
    const dto = plainToInstance(ConsultarReporteProduccionPecuariaDto, {
      animalId: '1',
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-20',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rechaza el reporte cuando faltan los campos obligatorios', () => {
    const dto = plainToInstance(ConsultarReporteProduccionPecuariaDto, {});

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(
      expect.arrayContaining(['animalId', 'fechaInicio', 'fechaFin']),
    );
  });

  it('rechaza un rango de fechas inválido (fechaInicio posterior a fechaFin)', () => {
    const dto = plainToInstance(ConsultarReporteProduccionPecuariaDto, {
      animalId: '1',
      fechaInicio: '2026-09-20',
      fechaFin: '2026-09-01',
    });

    const errores = validateSync(dto);

    expect(
      errores.some((error) =>
        Object.values(error.constraints ?? {}).some((mensaje) =>
          mensaje.includes('fecha inicial no puede ser posterior'),
        ),
      ),
    ).toBe(true);
  });
});
