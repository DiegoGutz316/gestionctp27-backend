import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { FiltrarCamasCultivoDto } from './filtrar-camas-cultivo.dto';

describe('FiltrarCamasCultivoDto', () => {
  it('permite no enviar q', () => {
    const dto = plainToInstance(FiltrarCamasCultivoDto, {});

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('acepta un valor de búsqueda válido', () => {
    const dto = plainToInstance(FiltrarCamasCultivoDto, { q: 'CAMA-001' });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.q).toBe('CAMA-001');
  });

  it('normaliza el texto de búsqueda recortando espacios', () => {
    const dto = plainToInstance(FiltrarCamasCultivoDto, { q: '  CAMA  ' });

    expect(dto.q).toBe('CAMA');
  });
});
