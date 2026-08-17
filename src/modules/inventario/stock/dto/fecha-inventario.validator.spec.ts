import { validate } from 'class-validator';
import { ConsultarMovimientosDto } from './consultar-movimientos.dto';
import { esFechaInventarioValida } from './fecha-inventario.validator';

describe('validación de fechas de inventario', () => {
  it('exige el formato exacto y rechaza fechas imposibles o futuras', () => {
    expect(esFechaInventarioValida('2026-02-28', '2026-08-16')).toBe(true);
    expect(esFechaInventarioValida('2026-2-28', '2026-08-16')).toBe(false);
    expect(esFechaInventarioValida('2026-02-30', '2026-08-16')).toBe(false);
    expect(esFechaInventarioValida('2026-08-17', '2026-08-16')).toBe(false);
  });

  it('rechaza un rango donde desde es posterior a hasta', async () => {
    const filtros = Object.assign(new ConsultarMovimientosDto(), {
      desde: '2026-08-16',
      hasta: '2026-08-15',
    });
    const errores = await validate(filtros);
    expect(errores.some((error) => error.property === '')).toBe(true);
  });
});
