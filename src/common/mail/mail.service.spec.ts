/**
 * Pruebas unitarias - MailService (envío vía Brevo) y buildMailConfig.
 * fetch se simula; no se envía ningún correo real.
 */
import { MailService } from './mail.service';
import { buildMailConfig } from './mail.config';

function crear(env: Record<string, string>) {
  return new MailService({ get: (k: string) => env[k] } as never);
}
const correo = {
  destinatario: 'admin@ctp27.test',
  asunto: 'Stock bajo',
  html: '<p>hola</p>',
};

describe('buildMailConfig', () => {
  it('valores por defecto: sin credenciales y remitente "CTP 27 de Abril"', () => {
    expect(buildMailConfig(() => undefined)).toEqual({
      apiKey: '',
      senderEmail: '',
      senderName: 'CTP 27 de Abril',
    });
  });

  it('lee las variables BREVO_API_KEY, MAIL_FROM_EMAIL y MAIL_FROM_NAME', () => {
    const env: Record<string, string> = {
      BREVO_API_KEY: 'k',
      MAIL_FROM_EMAIL: 'no-reply@x.cr',
      MAIL_FROM_NAME: 'Colegio',
    };
    expect(buildMailConfig((k) => env[k])).toEqual({
      apiKey: 'k',
      senderEmail: 'no-reply@x.cr',
      senderName: 'Colegio',
    });
  });
});

describe('MailService.enviarCorreo', () => {
  const fetchOriginal = global.fetch;
  const fetchSimulado = jest.fn();

  beforeEach(() => {
    fetchSimulado.mockReset();
    global.fetch = fetchSimulado;
  });
  afterAll(() => {
    global.fetch = fetchOriginal;
  });

  it('sin configuración: no llama a la red y no falla', async () => {
    const servicio = crear({});
    await expect(servicio.enviarCorreo(correo)).resolves.toBeUndefined();
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('con solo la API key (sin remitente) tampoco envía', async () => {
    await crear({ BREVO_API_KEY: 'k' }).enviarCorreo(correo);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('configurado: hace POST a Brevo con api-key, remitente, destinatario y contenido', async () => {
    fetchSimulado.mockResolvedValue({ ok: true });

    await crear({
      BREVO_API_KEY: 'secreta',
      MAIL_FROM_EMAIL: 'no-reply@x.cr',
    }).enviarCorreo(correo);

    const [url, init] = fetchSimulado.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect(init.headers['api-key']).toBe('secreta');
    expect(JSON.parse(init.body)).toEqual({
      sender: { email: 'no-reply@x.cr', name: 'CTP 27 de Abril' },
      to: [{ email: 'admin@ctp27.test' }],
      subject: 'Stock bajo',
      htmlContent: '<p>hola</p>',
    });
  });

  it('respuesta no exitosa de Brevo: lanza Error con estado, destinatario y cuerpo', async () => {
    fetchSimulado.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Key not found'),
    });
    await expect(
      crear({ BREVO_API_KEY: 'mala', MAIL_FROM_EMAIL: 'a@x.cr' }).enviarCorreo(
        correo,
      ),
    ).rejects.toThrow(
      'Brevo respondió 401 al enviar correo a admin@ctp27.test: Key not found',
    );
  });

  it('error de red: se propaga', async () => {
    fetchSimulado.mockRejectedValue(new Error('ECONNRESET'));
    await expect(
      crear({ BREVO_API_KEY: 'k', MAIL_FROM_EMAIL: 'a@x.cr' }).enviarCorreo(
        correo,
      ),
    ).rejects.toThrow('ECONNRESET');
  });
});
