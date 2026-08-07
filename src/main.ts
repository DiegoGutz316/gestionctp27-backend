import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // CORS: el origen permitido (URL del frontend) se lee del .env
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('GestiónCTP27 API')
    .setDescription(
      'API del sistema de gestión productiva del Colegio Técnico Profesional 27 de Abril.',
    )
    .setVersion('1.0')
    .addCookieAuth(
      'ctp27_access_token',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'ctp27_access_token',
      },
      'cookie',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'jwt',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
