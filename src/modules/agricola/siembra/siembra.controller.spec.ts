import { CLAVE_PERMISO } from '../../auth/decorators/requiere-permiso.decorator';
import type { PermisoRequerido } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { SiembraController } from './siembra.controller';

describe('SiembraController permisos', () => {
  it('exige permiso completo para registrar siembras', () => {
    const permiso = Reflect.getMetadata(
      CLAVE_PERMISO,
      SiembraController,
    ) as PermisoRequerido;

    expect(permiso).toEqual({
      modulo: ModuloSistema.AGRICOLA,
      nivel: NivelPermiso.COMPLETO,
    });
  });

  it('permite consultar con acceso de lectura', () => {
    const permiso = Reflect.getMetadata(
      CLAVE_PERMISO,
      // Se pasa el handler porque SetMetadata guarda allí el dato.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      SiembraController.prototype.consultar,
    ) as PermisoRequerido;

    expect(permiso).toEqual({
      modulo: ModuloSistema.AGRICOLA,
      nivel: NivelPermiso.LECTURA,
    });
  });
});
