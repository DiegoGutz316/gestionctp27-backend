import { crearHuellaMovimiento } from './stock.service';
import { TipoMovimiento } from './enums/tipo-movimiento.enum';

describe('huella de idempotencia de movimientos', () => {
  it('es estable para la misma solicitud y cambia con el payload', () => {
    const dto = { cantidad: 2, fecha: '2026-08-16', origen: 'Compra' };
    const primera = crearHuellaMovimiento(1, TipoMovimiento.ENTRADA, dto);
    expect(crearHuellaMovimiento(1, TipoMovimiento.ENTRADA, dto)).toBe(primera);
    expect(
      crearHuellaMovimiento(1, TipoMovimiento.ENTRADA, {
        ...dto,
        cantidad: 3,
      }),
    ).not.toBe(primera);
  });
});
