import { escaparComodines, patronContiene } from './patron-like';

describe('patronContiene', () => {
  it('envuelve el texto para buscar «contiene»', () => {
    expect(patronContiene('maiz')).toBe('%maiz%');
  });

  it.each([
    ['%', String.raw`%\%%`],
    ['_', String.raw`%\_%`],
    ['100%', String.raw`%100\%%`],
    ['ma_z', String.raw`%ma\_z%`],
  ])('escapa los comodines de «%s»', (texto, esperado) => {
    expect(patronContiene(texto)).toBe(esperado);
  });

  it('escapa la propia barra invertida', () => {
    // Si no se escapara, la barra que escribe el usuario anularía el escape
    // del comodín siguiente y «%» volvería a buscar todo el catálogo.
    expect(escaparComodines('\\')).toBe(String.raw`\\`);
    expect(escaparComodines(String.raw`\%`)).toBe(String.raw`\\\%`);
  });

  it('deja intacto el texto sin comodines, incluidas tildes y ñ', () => {
    expect(escaparComodines('Ñame con tildé')).toBe('Ñame con tildé');
  });

  it('acepta el texto vacío', () => {
    expect(patronContiene('')).toBe('%%');
  });
});
