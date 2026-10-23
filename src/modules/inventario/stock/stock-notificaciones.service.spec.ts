/* eslint-disable @typescript-eslint/no-unsafe-member-access -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas unitarias - StockNotificacionesService (aviso de stock bajo por correo
 * a los administradores activos, disparado desde las salidas de inventario).
 */
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { StockNotificacionesService } from './stock-notificaciones.service';

const aviso = {
  productoNombre: 'Concentrado',
  unidadMedida: 'KG',
  cantidadActual: 4,
  stockMinimo: 5,
};

describe('StockNotificacionesService', () => {
  const usuarios = { find: jest.fn() };
  const mail = { enviarCorreo: jest.fn() };
  let servicio: StockNotificacionesService;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    servicio = new StockNotificacionesService(usuarios as never, mail as never);
    const logger = (
      servicio as unknown as { logger: { warn: () => void; error: () => void } }
    ).logger;
    warn = jest.spyOn(logger, 'warn').mockImplementation();
    error = jest.spyOn(logger, 'error').mockImplementation();
  });

  it('busca solo administradores activos', async () => {
    usuarios.find.mockResolvedValue([]);
    await servicio.notificarStockBajo(aviso);
    expect(usuarios.find).toHaveBeenCalledWith({
      where: { rol: RolUsuario.ADMINISTRADOR, activo: true },
      select: { id: true, correo: true },
    });
  });

  it('sin administradores: advierte y no envía correos', async () => {
    usuarios.find.mockResolvedValue([]);
    await servicio.notificarStockBajo(aviso);
    expect(mail.enviarCorreo).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no hay administradores activos'),
    );
  });

  it('envía un correo por administrador con asunto y datos del producto', async () => {
    usuarios.find.mockResolvedValue([
      { id: '1', correo: 'a@x.cr' },
      { id: '2', correo: 'b@x.cr' },
    ]);
    mail.enviarCorreo.mockResolvedValue(undefined);

    await servicio.notificarStockBajo(aviso);

    expect(mail.enviarCorreo).toHaveBeenCalledTimes(2);
    const primero = mail.enviarCorreo.mock.calls[0][0] as {
      destinatario: string;
      asunto: string;
      html: string;
    };
    expect(primero.destinatario).toBe('a@x.cr');
    expect(primero.asunto).toBe('Stock bajo: Concentrado');
    expect(primero.html).toContain('Cantidad actual: 4 KG');
    expect(primero.html).toContain('Stock mínimo configurado: 5 KG');
  });

  it('si falla un envío, los demás se intentan igual y el error se registra sin propagarse', async () => {
    usuarios.find.mockResolvedValue([
      { id: '1', correo: 'a@x.cr' },
      { id: '2', correo: 'b@x.cr' },
    ]);
    mail.enviarCorreo
      .mockRejectedValueOnce(new Error('rechazado'))
      .mockResolvedValueOnce(undefined);

    await expect(servicio.notificarStockBajo(aviso)).resolves.toBeUndefined();

    expect(mail.enviarCorreo).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('a@x.cr'));
  });

  // HALLAZGO H-04: el nombre del producto se interpola sin escapar en el HTML del correo.
  it('H-04 (comportamiento actual): el nombre del producto entra sin escapar al HTML', async () => {
    usuarios.find.mockResolvedValue([{ id: '1', correo: 'a@x.cr' }]);
    mail.enviarCorreo.mockResolvedValue(undefined);

    await servicio.notificarStockBajo({ ...aviso, productoNombre: '<b>X</b>' });

    expect(
      (mail.enviarCorreo.mock.calls[0][0] as { html: string }).html,
    ).toContain('<strong><b>X</b></strong>');
  });
});
