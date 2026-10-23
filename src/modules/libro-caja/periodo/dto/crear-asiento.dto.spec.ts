import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CrearAsientoDto } from './crear-asiento.dto';

const opciones = { whitelist: true, forbidNonWhitelisted: true };

function dto(extra: Record<string, unknown> = {}) {
  return plainToInstance(CrearAsientoDto, {
    fecha: '2027-03-12',
    descripcion: 'Venta de huevos',
    ingresos: 10,
    egresos: 0,
    ...extra,
  });
}

function mensajes(instancia: CrearAsientoDto): string[] {
  return validateSync(instancia, opciones).flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
}

describe('CrearAsientoDto', () => {
  it('acepta un ingreso válido', () => {
    expect(mensajes(dto())).toHaveLength(0);
  });

  it('dice solo que el monto no es un número', () => {
    expect(mensajes(dto({ ingresos: 'no-numero' }))).toEqual([
      'El ingreso debe ser un número válido',
    ]);
  });

  it('rechaza un ingreso negativo con un solo mensaje', () => {
    expect(mensajes(dto({ ingresos: -1, egresos: 0 }))).toEqual([
      'El ingreso no puede ser negativo',
    ]);
  });

  it('rechaza más de dos decimales', () => {
    expect(mensajes(dto({ ingresos: 1.005, egresos: 0 }))).toEqual([
      'El ingreso admite como máximo 2 decimales',
    ]);
  });

  it('rechaza un monto sobre el máximo', () => {
    const lista = mensajes(dto({ ingresos: 10_000_000_000, egresos: 0 }));
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatch(/no puede superar/);
  });

  it('rechaza descripción vacía', () => {
    expect(mensajes(dto({ descripcion: '   ' }))).toEqual(
      expect.arrayContaining(['La descripción es obligatoria']),
    );
  });

  it('rechaza ingreso y egreso en cero', () => {
    const lista = mensajes(dto({ ingresos: 0, egresos: 0 }));
    expect(lista).toEqual(
      expect.arrayContaining([
        'Indique un ingreso o un egreso, no ambos. El otro queda en 0.',
      ]),
    );
  });
});
