/**
 * Entrada serverless para Vercel.
 *
 * `src/main.ts` arranca un servidor propio con `app.listen`, que en Vercel no
 * aplica: aqui cada peticion llega a una funcion. Esta entrada crea la misma
 * aplicacion Nest con la misma configuracion (cookie-parser, CORS y Swagger),
 * pero en lugar de escuchar un puerto entrega a Vercel el manejador de Express
 * que Nest ya construyo por dentro.
 *
 * No se requiere `express` directamente: es dependencia transitiva de
 * @nestjs/platform-express y no figura en `dependencies`, asi que el
 * empaquetador de Vercel no la incluye y el modulo no cargaba. La instancia se
 * pide al adaptador, que es el mismo objeto.
 *
 * La aplicacion se cachea en una variable del modulo: mientras la funcion siga
 * caliente, las peticiones siguientes reutilizan lo ya construido en lugar de
 * levantar Nest y abrir conexiones a Postgres en cada llamada.
 */
const cookieParser = require('cookie-parser');
const { NestFactory } = require('@nestjs/core');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');

const { AppModule } = require('../dist/app.module');
const {
  obtenerOrigenesPermitidos,
} = require('../dist/common/http/origenes-permitidos');

let preparacion = null;

async function preparar() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: obtenerOrigenesPermitidos((clave) => process.env[clave]),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['Content-Disposition'],
  });

  const config = new DocumentBuilder()
    .setTitle('GestiónCTP27 API')
    .setDescription(
      'API del sistema de gestión productiva del Colegio Técnico Profesional 27 de Abril.',
    )
    .setVersion('1.0')
    .addCookieAuth(
      'ctp27_access_token',
      { type: 'apiKey', in: 'cookie', name: 'ctp27_access_token' },
      'cookie',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt',
    )
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));

  // `init` deja la aplicacion lista sin abrir un puerto, que es lo que
  // corresponde cuando quien escucha es la plataforma.
  await app.init();

  return app.getHttpAdapter().getInstance();
}

module.exports = async (peticion, respuesta) => {
  preparacion = preparacion ?? preparar();
  const servidor = await preparacion;
  servidor(peticion, respuesta);
};
