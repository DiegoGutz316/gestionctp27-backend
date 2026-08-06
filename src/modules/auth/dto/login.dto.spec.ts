import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('normaliza un correo válido', () => {
    const dto = plainToInstance(LoginDto, {
      correo: '  ADMIN@CTP27ABRIL.ED.CR ',
      contrasena: 'secreto-seguro',
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.correo).toBe('admin@ctp27abril.ed.cr');
  });

  it('rechaza credenciales vacías', () => {
    const dto = plainToInstance(LoginDto, { correo: '', contrasena: '' });

    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
