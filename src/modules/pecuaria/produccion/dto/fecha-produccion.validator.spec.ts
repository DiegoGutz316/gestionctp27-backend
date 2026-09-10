import { esFechaIsoValida, fechaActualCostaRica } from './fecha-produccion.validator';

describe('fecha-produccion.validator', () => {
  it('acepta una fecha calendario válida', () => {
    expect(esFechaIsoValida('2026-09-08')).toBe(true);
  });

  it('rechaza una fecha inexistente', () => {
    expect(esFechaIsoValida('2026-02-30')).toBe(false);
  });

  it('devuelve la fecha actual de Costa Rica en AAAA-MM-DD', () => {
    expect(fechaActualCostaRica(new Date('2026-09-09T06:00:00.000Z'))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
});
