/**
 * Pruebas unitarias - CamaCultivoService.eliminar (soporte de
 * DELETE /agricola/camas/:id, que responde 204). El resto del servicio se
 * cubre en cama-cultivo.service.spec.ts.
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { crearRepositorioSimulado } from '../../../../test/helpers/typeorm-mocks';
import { CamaCultivoService } from './cama-cultivo.service';

describe('CamaCultivoService.eliminar', () => {
  let camas: ReturnType<typeof crearRepositorioSimulado>;
  let siembras: ReturnType<typeof crearRepositorioSimulado>;
  let servicio: CamaCultivoService;
  const cama = { id: 5, codigo: 'C-05' };

  beforeEach(() => {
    camas = crearRepositorioSimulado();
    siembras = crearRepositorioSimulado();
    servicio = new CamaCultivoService(camas as never, siembras as never);
  });

  it('cama nunca usada: la elimina', async () => {
    camas.findOne.mockResolvedValue(cama);
    siembras.count.mockResolvedValue(0);

    await expect(servicio.eliminar(5)).resolves.toBeUndefined();

    expect(siembras.count).toHaveBeenCalledWith({ where: { cama: { id: 5 } } });
    expect(camas.remove).toHaveBeenCalledWith(cama);
  });

  it('404 si no existe', async () => {
    camas.findOne.mockResolvedValue(null);
    await expect(servicio.eliminar(5)).rejects.toThrow(
      new NotFoundException('La cama de cultivo no existe.'),
    );
    expect(camas.remove).not.toHaveBeenCalled();
  });

  it.each([
    [1, '1 siembra registrada'],
    [4, '4 siembras registradas'],
  ])(
    '409 con %i siembras: no elimina y el mensaje usa singular/plural',
    async (n, texto) => {
      camas.findOne.mockResolvedValue(cama);
      siembras.count.mockResolvedValue(n);

      await expect(servicio.eliminar(5)).rejects.toThrow(texto);
      expect(camas.remove).not.toHaveBeenCalled();
    },
  );

  it('carrera: violación de llave foránea (23503) se traduce a 409 "está en uso"', async () => {
    camas.findOne.mockResolvedValue(cama);
    siembras.count.mockResolvedValue(0);
    camas.remove.mockRejectedValue(
      new QueryFailedError(
        'DELETE',
        [],
        Object.assign(new Error('fk'), { code: '23503' }),
      ),
    );

    await expect(servicio.eliminar(5)).rejects.toThrow(
      new ConflictException(
        'No se puede eliminar la cama "C-05": está en uso.',
      ),
    );
  });

  it('otros errores de BD se propagan', async () => {
    camas.findOne.mockResolvedValue(cama);
    siembras.count.mockResolvedValue(0);
    const fallo = new Error('caída');
    camas.remove.mockRejectedValue(fallo);
    await expect(servicio.eliminar(5)).rejects.toBe(fallo);
  });
});
