import { CLAVE_PERMISO } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { ReporteProduccionPecuariaController } from './reporte-produccion-pecuaria.controller';

describe('ReporteProduccionPecuariaController permisos', () => {
  it('exige permiso de lectura de reportes para generar el reporte', () => {
    expect(
      Reflect.getMetadata(CLAVE_PERMISO, ReporteProduccionPecuariaController),
    ).toEqual({
      modulo: ModuloSistema.REPORTES,
      nivel: NivelPermiso.LECTURA,
    });
  });
});
