import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { TipoCultivo } from '../enums/tipo-cultivo.enum';
import { EditarCultivoDto } from './editar-cultivo.dto';

describe('EditarCultivoDto', () => {
  it('acepta una edicion parcial: solo lo que cambia', async () => {
    const errores = await validar({ descripcion: 'Variedad criolla' });

    expect(errores).toHaveLength(0);
  });

  it('acepta un cuerpo vacio: no cambia nada', async () => {
    expect(await validar({})).toHaveLength(0);
  });

  describe('los campos obligatorios no aceptan null', () => {
    it.each([
      ['nombre', 'El nombre del cultivo es obligatorio'],
      ['tipo', 'Seleccione un tipo de cultivo válido'],
      ['activo', 'El estado activo debe ser verdadero o falso'],
    ])('%s en null se rechaza con un mensaje claro', async (campo, mensaje) => {
      const errores = await validar({ [campo]: null });

      expect(errores.map((error) => error.property)).toEqual([campo]);
      expect(mensajes(errores)).toContain(mensaje);
    });

    it.each(['nombre', 'tipo', 'activo'])(
      '%s ausente no se valida',
      async (campo) => {
        expect(await validar({ [campo]: undefined })).toHaveLength(0);
      },
    );
  });

  it('sigue aplicando las reglas del registro a lo que si viene', async () => {
    const errores = await validar({
      nombre: 'a',
      tipo: 'PODA',
      activo: 'si',
    });

    expect(errores.map((error) => error.property).sort()).toEqual([
      'activo',
      'nombre',
      'tipo',
    ]);
  });

  describe('descripcion', () => {
    it('null la borra', async () => {
      const dto = plainToInstance(EditarCultivoDto, { descripcion: null });

      expect(await validate(dto)).toHaveLength(0);
      expect(dto.descripcion).toBeNull();
    });

    it('el texto vacio tambien la borra', async () => {
      const dto = plainToInstance(EditarCultivoDto, { descripcion: '   ' });

      expect(await validate(dto)).toHaveLength(0);
      expect(dto.descripcion).toBeNull();
    });

    it('rechaza una descripcion de mas de 500 caracteres', async () => {
      const errores = await validar({ descripcion: 'a'.repeat(501) });

      expect(mensajes(errores)).toContain(
        'La descripción no puede superar 500 caracteres',
      );
    });
  });

  it('recorta el nombre y junta los espacios de adentro', async () => {
    const dto = plainToInstance(EditarCultivoDto, {
      nombre: '  Chile   dulce  ',
      tipo: TipoCultivo.HORTALIZA,
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.nombre).toBe('Chile dulce');
  });

  async function validar(datos: Record<string, unknown>) {
    return validate(plainToInstance(EditarCultivoDto, datos));
  }

  function mensajes(errores: Awaited<ReturnType<typeof validate>>): string[] {
    return errores.flatMap((error) => Object.values(error.constraints ?? {}));
  }
});
