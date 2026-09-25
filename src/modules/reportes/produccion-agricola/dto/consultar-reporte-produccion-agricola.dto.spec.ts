import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ConsultarReporteProduccionAgricolaDto } from './consultar-reporte-produccion-agricola.dto';

describe('ConsultarReporteProduccionAgricolaDto', () => {
  it('acepta un rango de fechas válido sin cultivo ni cama', () => {
    const dto = plainToInstance(ConsultarReporteProduccionAgricolaDto, {
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-20',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('acepta cultivo y camaId combinados con el rango', () => {
    const dto = plainToInstance(ConsultarReporteProduccionAgricolaDto, {
      cultivo: 'Tomate',
      camaId: '1',
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-20',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rechaza el reporte cuando faltan las fechas obligatorias', () => {
    const dto = plainToInstance(ConsultarReporteProduccionAgricolaDto, {});

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(
      expect.arrayContaining(['fechaInicio', 'fechaFin']),
    );
  });

  it('rechaza un rango de fechas inválido (fechaInicio posterior a fechaFin)', () => {
    const dto = plainToInstance(ConsultarReporteProduccionAgricolaDto, {
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

  it('rechaza un camaId que no sea un entero positivo', () => {
    const dto = plainToInstance(ConsultarReporteProduccionAgricolaDto, {
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-20',
      camaId: '-1',
    });

    const camposInvalidos = validateSync(dto).map((error) => error.property);

    expect(camposInvalidos).toEqual(expect.arrayContaining(['camaId']));
  });
});
