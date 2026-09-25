import { CLAVE_PERMISO } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { ReporteProduccionAgricolaController } from './reporte-produccion-agricola.controller';

describe('ReporteProduccionAgricolaController permisos', () => {
  it('exige permiso de lectura de reportes para generar el reporte', () => {
    expect(
      Reflect.getMetadata(CLAVE_PERMISO, ReporteProduccionAgricolaController),
    ).toEqual({
      modulo: ModuloSistema.REPORTES,
      nivel: NivelPermiso.LECTURA,
    });
  });
});
