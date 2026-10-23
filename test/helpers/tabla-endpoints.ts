import type { INestApplication, Provider, Type } from '@nestjs/common';
import type { ModuloSistema } from '../../src/modules/auth/enums/modulo-sistema.enum';
import type { NivelPermiso } from '../../src/modules/auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../src/modules/auth/tipos/jwt-payload';
import {
  crearAppDePrueba,
  llamar,
  rolesCon,
  rolesSin,
  servicioSimulado,
  usuarioDePrueba,
} from './endpoint-app';

type Metodo = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface EntradaInvalida {
  /** Ruta alternativa (por ejemplo, con un id no numérico). */
  ruta?: string;
  cuerpo?: object;
  cabeceras?: Record<string, string>;
}

/** Descripción de un endpoint: de ella se generan las pruebas estándar. */
export interface CasoEndpoint {
  metodo: Metodo;
  /** Ruta concreta usada en la prueba (con ids y query strings reales). */
  ruta: string;
  modulo: ModuloSistema;
  nivel: NivelPermiso;
  /** Método del servicio simulado al que debe delegar el controller. */
  servicio: string;
  cuerpo?: object;
  cabeceras?: Record<string, string>;
  /** Código HTTP esperado en éxito. Por defecto: 201 en POST, 200 en el resto. */
  estado?: number;
  /** Valor que devuelve el servicio simulado (el endpoint debe reenviarlo). */
  respuesta?: unknown;
  /** Cuerpo esperado en la respuesta si el controller transforma el resultado. */
  cuerpoEsperado?: unknown;
  /** Argumentos con los que debe invocarse el servicio. */
  argumentos: (usuario: UsuarioAutenticado) => unknown[];
  /** Entradas que deben rechazarse con 400 sin llamar al servicio. */
  invalidos?: Array<[descripcion: string, entrada: EntradaInvalida]>;
}

export interface ConfiguracionTabla {
  titulo: string;
  controller: Type<unknown>;
  /** Token de inyección del servicio que usa el controller. */
  servicioToken: Type<unknown>;
  /** Providers adicionales que el controller necesite. */
  providers?: Provider[];
  /** Métodos del servicio que se simulan. */
  metodosServicio: string[];
  casos: CasoEndpoint[];
}

/**
 * Genera la batería estándar de pruebas HTTP para cada endpoint de un
 * controller. Cada caso verifica:
 *  - delegación al servicio con los argumentos correctos y reenvío de su
 *    respuesta, para todos los roles que la matriz de permisos autoriza;
 *  - 401 sin sesión;
 *  - 403 (y servicio no invocado) para los roles sin el permiso requerido;
 *  - 400 (y servicio no invocado) para cada entrada inválida declarada.
 *
 * Devuelve el servicio simulado para que el spec agregue casos propios.
 */
export function probarEndpoints(config: ConfiguracionTabla) {
  const servicio = servicioSimulado(...config.metodosServicio);
  let app: INestApplication;

  describe(`${config.titulo} (endpoints)`, () => {
    beforeAll(async () => {
      app = await crearAppDePrueba({
        controllers: [config.controller],
        providers: [
          { provide: config.servicioToken, useValue: servicio },
          ...(config.providers ?? []),
        ],
      });
    });
    afterAll(() => app.close());
    beforeEach(() => jest.resetAllMocks());

    for (const caso of config.casos) {
      const estado = caso.estado ?? (caso.metodo === 'post' ? 201 : 200);

      describe(`${caso.metodo.toUpperCase()} ${caso.ruta}`, () => {
        const enviar = (
          rol?: Parameters<typeof llamar>[3],
          entrada: EntradaInvalida = {},
        ) => {
          let peticion = llamar(
            app,
            caso.metodo,
            entrada.ruta ?? caso.ruta,
            rol,
          );
          for (const [clave, valor] of Object.entries(
            entrada.cabeceras ?? caso.cabeceras ?? {},
          )) {
            peticion = peticion.set(clave, valor);
          }
          const cuerpo = entrada.cuerpo ?? caso.cuerpo;
          return cuerpo ? peticion.send(cuerpo) : peticion;
        };

        it.each(rolesCon(caso.modulo, caso.nivel))(
          `${estado}: %s delega en servicio.${caso.servicio} y devuelve su respuesta`,
          async (rol) => {
            const resultado = caso.respuesta ?? { ok: true };
            servicio[caso.servicio].mockResolvedValue(resultado);

            const res = await enviar(rol);

            expect(res.status).toBe(estado);
            if (estado !== 204) {
              expect(res.body).toEqual(
                caso.cuerpoEsperado ?? JSON.parse(JSON.stringify(resultado)),
              );
            }
            expect(servicio[caso.servicio]).toHaveBeenCalledTimes(1);
            expect(servicio[caso.servicio]).toHaveBeenCalledWith(
              ...caso.argumentos(usuarioDePrueba(rol)),
            );
          },
        );

        it('401: sin sesión', async () => {
          const res = await enviar(undefined);
          expect(res.status).toBe(401);
          expect(servicio[caso.servicio]).not.toHaveBeenCalled();
        });

        const sinPermiso = rolesSin(caso.modulo, caso.nivel);
        if (sinPermiso.length > 0) {
          it.each(sinPermiso)(
            `403: %s no tiene ${caso.nivel} en ${caso.modulo}`,
            async (rol) => {
              const res = await enviar(rol);
              expect(res.status).toBe(403);
              expect(servicio[caso.servicio]).not.toHaveBeenCalled();
            },
          );
        }

        if (caso.invalidos?.length) {
          it.each(caso.invalidos)('400: %s', async (_descripcion, entrada) => {
            const rol = rolesCon(caso.modulo, caso.nivel)[0];
            const res = await enviar(rol, entrada);
            expect(res.status).toBe(400);
            expect(servicio[caso.servicio]).not.toHaveBeenCalled();
          });
        }
      });
    }
  });

  return {
    servicio,
    /** App levantada (disponible dentro de los `it` del spec). */
    app: () => app,
  };
}
