/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - CosechaController (módulo AGRICOLA)
 *
 *   POST /agricola/cosechas  COMPLETO
 *   GET  /agricola/cosechas  LECTURA (filtros por cultivo, cama, rango de fechas)
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { CosechaController } from './cosecha.controller';
import { CosechaService } from './cosecha.service';

const M = ModuloSistema.AGRICOLA;
const cosecha = {
  siembraId: 1,
  fecha: '2026-09-25',
  cantidadObtenida: 12.5,
  unidadMedida: 'KG',
};

probarEndpoints({
  titulo: 'CosechaController',
  controller: CosechaController,
  servicioToken: CosechaService,
  metodosServicio: ['registrar', 'consultar'],
  casos: [
    {
      metodo: 'post',
      ruta: '/agricola/cosechas',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'registrar',
      cuerpo: { ...cosecha, cerrarCiclo: false, observaciones: 'Buena' },
      argumentos: (u) => [expect.objectContaining(cosecha), u],
      invalidos: [
        ['sin siembra', { cuerpo: { ...cosecha, siembraId: undefined } }],
        ['cantidad negativa', { cuerpo: { ...cosecha, cantidadObtenida: -1 } }],
        ['cantidad cero', { cuerpo: { ...cosecha, cantidadObtenida: 0 } }],
        ['unidad inexistente', { cuerpo: { ...cosecha, unidadMedida: 'TON' } }],
        ['fecha futura', { cuerpo: { ...cosecha, fecha: '2999-01-01' } }],
        [
          'cerrarCiclo no booleano',
          { cuerpo: { ...cosecha, cerrarCiclo: 'si' } },
        ],
        ['propiedad no permitida', { cuerpo: { ...cosecha, precio: 5 } }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/agricola/cosechas?cultivo=Tomate&camaId=2&desde=2026-09-01&hasta=2026-09-30&pagina=2&limite=5',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'consultar',
      respuesta: { datos: [], total: 0 },
      argumentos: () => [
        expect.objectContaining({
          cultivo: 'Tomate',
          camaId: 2,
          desde: '2026-09-01',
          hasta: '2026-09-30',
          pagina: 2,
          limite: 5,
        }),
      ],
      invalidos: [
        ['camaId no numérico', { ruta: '/agricola/cosechas?camaId=abc' }],
        [
          'rango invertido',
          { ruta: '/agricola/cosechas?desde=2026-09-30&hasta=2026-09-01' },
        ],
        [
          'fecha futura en desde',
          { ruta: '/agricola/cosechas?desde=2999-01-01' },
        ],
        [
          'fecha junto a desde/hasta',
          { ruta: '/agricola/cosechas?fecha=2026-09-18&desde=2026-09-01' },
        ],
        ['límite > 100', { ruta: '/agricola/cosechas?limite=101' }],
        ['página 0', { ruta: '/agricola/cosechas?pagina=0' }],
      ],
    },
  ],
});
