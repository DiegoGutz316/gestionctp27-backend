import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { RegistrarSiembraDto } from './registrar-siembra.dto';

describe('RegistrarSiembraDto', () => {
  const datosValidos = {
    camaId: 1,
    tipoCultivo: 'Tomate',
    fechaSiembra: '2026-09-15',
    cantidadSembrada: 25,
  };

  it('acepta una siembra válida', async () => {
    const errores = await validar(datosValidos);

    expect(errores).toHaveLength(0);
  });

  it('rechaza una siembra sin cama', async () => {
    const errores = await validar({
      tipoCultivo: datosValidos.tipoCultivo,
      fechaSiembra: datosValidos.fechaSiembra,
      cantidadSembrada: datosValidos.cantidadSembrada,
    });

    expect(errores.some((error) => error.property === 'camaId')).toBe(true);
  });

  it.each([0, -1])('rechaza la cantidad inválida %s', async (cantidad) => {
    const errores = await validar({
      ...datosValidos,
      cantidadSembrada: cantidad,
    });

    expect(errores.some((error) => error.property === 'cantidadSembrada')).toBe(
      true,
    );
  });

  it('rechaza una fecha futura', async () => {
    const errores = await validar({
      ...datosValidos,
      fechaSiembra: '2999-01-01',
    });

    expect(errores.some((error) => error.property === 'fechaSiembra')).toBe(
      true,
    );
  });
});

async function validar(datos: object) {
  return validate(plainToInstance(RegistrarSiembraDto, datos));
}
