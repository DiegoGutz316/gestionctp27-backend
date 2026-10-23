import { esIngresoOEgresoExclusivo } from './ingreso-o-egreso.validator';

describe('esIngresoOEgresoExclusivo', () => {
  it('acepta un ingreso con egreso en cero', () => {
    expect(esIngresoOEgresoExclusivo({ ingresos: 1200000, egresos: 0 })).toBe(
      true,
    );
  });

  it('acepta un egreso con ingreso en cero', () => {
    expect(esIngresoOEgresoExclusivo({ ingresos: 0, egresos: 4513.32 })).toBe(
      true,
    );
  });

  it('rechaza ambos en cero', () => {
    expect(esIngresoOEgresoExclusivo({ ingresos: 0, egresos: 0 })).toBe(false);
  });

  it('rechaza ingreso y egreso a la vez', () => {
    expect(esIngresoOEgresoExclusivo({ ingresos: 100, egresos: 50 })).toBe(
      false,
    );
  });

  it('deja el monto negativo a su propio validador', () => {
    expect(esIngresoOEgresoExclusivo({ ingresos: -1, egresos: 0 })).toBe(true);
  });
});
