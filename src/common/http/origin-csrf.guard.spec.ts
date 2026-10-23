import { origenMutantePermitido } from './origin-csrf.guard';

const permitidos = ['http://localhost:3000'];

describe('origenMutantePermitido', () => {
  it('acepta un Origin del frontend', () => {
    expect(
      origenMutantePermitido({
        origin: 'http://localhost:3000',
        referer: undefined,
        host: 'localhost:4000',
        protocolo: 'http',
        cookiePresente: true,
        permitidos,
      }),
    ).toBe(true);
  });

  it('rechaza un Origin ajeno aunque haya cookie', () => {
    expect(
      origenMutantePermitido({
        origin: 'https://evil.example',
        referer: 'https://evil.example/ataque',
        host: 'localhost:4000',
        protocolo: 'http',
        cookiePresente: true,
        permitidos,
      }),
    ).toBe(false);
  });

  it('rechaza una mutación con cookie y sin Origin ni Referer', () => {
    expect(
      origenMutantePermitido({
        origin: undefined,
        referer: undefined,
        host: 'localhost:4000',
        protocolo: 'http',
        cookiePresente: true,
        permitidos,
      }),
    ).toBe(false);
  });

  it('acepta cookie sin Origin si el Referer es el frontend', () => {
    expect(
      origenMutantePermitido({
        origin: undefined,
        referer: 'http://localhost:3000/dashboard/libro-caja',
        host: 'localhost:4000',
        protocolo: 'http',
        cookiePresente: true,
        permitidos,
      }),
    ).toBe(true);
  });

  it('acepta Bearer o rutas públicas sin cookie y sin Origin', () => {
    expect(
      origenMutantePermitido({
        origin: undefined,
        referer: undefined,
        host: 'localhost:4000',
        protocolo: 'http',
        cookiePresente: false,
        permitidos,
      }),
    ).toBe(true);
  });

  it('acepta el Origin del propio servidor (Swagger)', () => {
    expect(
      origenMutantePermitido({
        origin: 'http://localhost:4000',
        referer: undefined,
        host: 'localhost:4000',
        protocolo: 'http',
        cookiePresente: true,
        permitidos,
      }),
    ).toBe(true);
  });
});
