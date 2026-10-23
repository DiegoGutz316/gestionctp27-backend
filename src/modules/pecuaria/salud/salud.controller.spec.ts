import { CLAVE_PERMISO } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { SaludController } from './salud.controller';

describe('SaludController permisos', () => {
  it('exige permiso completo de pecuaria para registrar', () => {
    expect(Reflect.getMetadata(CLAVE_PERMISO, SaludController)).toEqual({
      modulo: ModuloSistema.PECUARIA,
      nivel: NivelPermiso.COMPLETO,
    });
  });

  it('permite consultar el historial con permiso de lectura', () => {
    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      Reflect.getMetadata(CLAVE_PERMISO, SaludController.prototype.consultar),
    ).toEqual({
      modulo: ModuloSistema.PECUARIA,
      nivel: NivelPermiso.LECTURA,
    });
  });
});
