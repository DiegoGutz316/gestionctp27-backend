import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ActividadAgricola } from '../enums/actividad-agricola.enum';
import { TipoTratamiento } from '../enums/tipo-tratamiento.enum';
import { UnidadTratamiento } from '../enums/unidad-tratamiento.enum';
import { RegistrarTratamientoDto } from './registrar-tratamiento.dto';

describe('RegistrarTratamientoDto', () => {
  const base = {
    siembraId: 1,
    fecha: '2026-09-17',
  };

  const conProducto = {
    ...base,
    actividad: ActividadAgricola.TRATAMIENTO,
    tipo: TipoTratamiento.FUNGICIDA,
    producto: 'Caldo bordelés',
    cantidad: 2.5,
    unidad: UnidadTratamiento.L,
  };

  it('acepta un riego sin producto', async () => {
    const errores = await validar({
      ...base,
      actividad: ActividadAgricola.RIEGO,
    });

    expect(errores).toHaveLength(0);
  });

  it('acepta una limpieza con observaciones', async () => {
    const errores = await validar({
      ...base,
      actividad: ActividadAgricola.LIMPIEZA,
      observaciones: 'Se retiró maleza del borde.',
    });

    expect(errores).toHaveLength(0);
  });

  it('acepta un tratamiento con su producto', async () => {
    const errores = await validar(conProducto);

    expect(errores).toHaveLength(0);
  });

  it.each([ActividadAgricola.FERTILIZACION, ActividadAgricola.TRATAMIENTO])(
    'rechaza %s sin producto',
    async (actividad) => {
      const errores = await validar({ ...base, actividad });

      expect(mensajes(errores)).toContain(
        'Al fertilizar o aplicar un tratamiento, indique el producto, la cantidad y la unidad',
      );
    },
  );

  it.each([ActividadAgricola.RIEGO, ActividadAgricola.LIMPIEZA])(
    'rechaza %s con producto',
    async (actividad) => {
      const errores = await validar({ ...conProducto, actividad });

      expect(mensajes(errores)).toContain(
        'Un riego o una limpieza no llevan producto ni cantidad',
      );
    },
  );

  it('rechaza una actividad inventada', async () => {
    const errores = await validar({ ...base, actividad: 'PODA' });

    expect(errores.some((error) => error.property === 'actividad')).toBe(true);
  });

  it('rechaza un cuidado sin actividad', async () => {
    const errores = await validar(base);

    expect(errores.some((error) => error.property === 'actividad')).toBe(true);
  });

  async function validar(datos: Record<string, unknown>) {
    return validate(plainToInstance(RegistrarTratamientoDto, datos));
  }

  function mensajes(errores: Awaited<ReturnType<typeof validate>>): string[] {
    return errores.flatMap((error) => Object.values(error.constraints ?? {}));
  }
});
