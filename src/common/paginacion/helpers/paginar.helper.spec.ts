import { crearMetaPaginacion } from './paginar.helper';

describe('crearMetaPaginacion', () => {
  it('conserva la página solicitada cuando está fuera de rango', () => {
    expect(crearMetaPaginacion({ pagina: 8, limite: 10 }, 15)).toEqual({
      pagina: 8,
      limite: 10,
      total: 15,
      totalPaginas: 2,
      tieneAnterior: true,
      tieneSiguiente: false,
    });
  });
});
