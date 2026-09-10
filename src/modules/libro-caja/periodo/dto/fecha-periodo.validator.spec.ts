import { esFechaIsoValida } from './fecha-periodo.validator';

describe('esFechaIsoValida', () => {
  it('acepta una fecha calendario válida', () => {
    expect(esFechaIsoValida('2026-02-01')).toBe(true);
  });

  it('rechaza días que no existen', () => {
    expect(esFechaIsoValida('2026-02-30')).toBe(false);
  });

  it('rechaza formatos distintos a AAAA-MM-DD', () => {
    expect(esFechaIsoValida('01/02/2026')).toBe(false);
  });
});
