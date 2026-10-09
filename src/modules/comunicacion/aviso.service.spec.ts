import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { AvisoService } from './aviso.service';
import { CategoriaAviso } from './enums/categoria-aviso.enum';
import { EstadoAviso } from './enums/estado-aviso.enum';

const actor = {
  id: '11111111-1111-1111-1111-111111111111',
  correo: 'docente@colegio.cr',
  nombre: 'Docente',
  rol: RolUsuario.DOCENTE_AGRICOLA,
};

function avisoActivo() {
  return {
    id: 7,
    titulo: 'Feria agrícola',
    descripcion: 'En el gimnasio del colegio.',
    fecha: '2026-11-15',
    categoria: null,
    estado: EstadoAviso.ACTIVO,
    creadoEn: new Date('2026-10-01T12:00:00.000Z'),
    creadoPor: '22222222-2222-2222-2222-222222222222',
    actualizadoEn: null,
    actualizadoPor: null,
  };
}

function repositorio(aviso: ReturnType<typeof avisoActivo> | null = avisoActivo()) {
  return {
    findOneBy: jest.fn().mockResolvedValue(aviso),
    save: jest.fn().mockImplementation(async (entidad) => entidad),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn(),
  };
}

describe('AvisoService', () => {
  it('actualiza título, descripción, fecha y estado y registra al responsable', async () => {
    const repo = repositorio();
    const service = new AvisoService(repo as never);

    const respuesta = await service.actualizar(
      7,
      {
        titulo: 'Feria del agricultor',
        descripcion: 'El sábado en la mañana.',
        fecha: '2026-11-20',
        categoria: CategoriaAviso.EVENTOS,
        estado: EstadoAviso.ACTIVO,
      },
      actor,
    );

    expect(respuesta.titulo).toBe('Feria del agricultor');
    expect(respuesta.descripcion).toBe('El sábado en la mañana.');
    expect(respuesta.fecha).toBe('2026-11-20');
    expect(respuesta.estado).toBe(EstadoAviso.ACTIVO);
    expect(respuesta.actualizadoPor).toBe(actor.id);
    expect(respuesta.actualizadoEn).toBeInstanceOf(Date);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('responde que el aviso no existe al editarlo', async () => {
    const service = new AvisoService(repositorio(null) as never);

    await expect(
      service.actualizar(
        99,
        {
          titulo: 'Feria',
          descripcion: 'Detalle',
          fecha: '2026-11-20',
          categoria: CategoriaAviso.EVENTOS,
          estado: EstadoAviso.ACTIVO,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('desactiva el aviso sin eliminarlo y registra al responsable', async () => {
    const repo = repositorio();
    const service = new AvisoService(repo as never);

    const respuesta = await service.desactivar(7, actor);

    expect(respuesta.id).toBe(7);
    expect(respuesta.estado).toBe(EstadoAviso.INACTIVO);
    expect(respuesta.actualizadoPor).toBe(actor.id);
    expect(respuesta.actualizadoEn).toBeInstanceOf(Date);
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('rechaza desactivar un aviso que ya está inactivo', async () => {
    const inactivo = avisoActivo();
    inactivo.estado = EstadoAviso.INACTIVO;
    const repo = repositorio(inactivo);
    const service = new AvisoService(repo as never);

    await expect(service.desactivar(7, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('guarda el flyer y lo marca como presente', async () => {
    const repo = repositorio();
    const service = new AvisoService(repo as never);

    const respuesta = await service.guardarFlyer(
      7,
      {
        buffer: Buffer.from('imagen'),
        mimetype: 'image/png',
        size: 6,
      },
      actor,
    );

    expect(respuesta.tieneFlyer).toBe(true);
    expect(repo.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ flyerTipo: 'image/png' }),
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('rechaza un flyer que no es imagen', async () => {
    const repo = repositorio();
    const service = new AvisoService(repo as never);

    await expect(
      service.guardarFlyer(
        7,
        {
          buffer: Buffer.from('texto'),
          mimetype: 'application/pdf',
          size: 5,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('responde que el aviso no existe al desactivarlo', async () => {
    const service = new AvisoService(repositorio(null) as never);

    await expect(service.desactivar(99, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
