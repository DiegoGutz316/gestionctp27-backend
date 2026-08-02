import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global con Zod (nestjs-zod)
  app.useGlobalPipes(new ZodValidationPipe());

  // CORS: el origen permitido (URL del frontend) se lee del .env
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // Documentación OpenAPI/Swagger. Los DTOs creados con createZodDto()
  // (nestjs-zod) generan su esquema automáticamente; cleanupOpenApiDoc
  // post-procesa el documento para que ese esquema salga correcto.
  const config = new DocumentBuilder()
    .setTitle('GestiónCTP27 API')
    .setDescription(
      'API del sistema de gestión productiva del Colegio Técnico Profesional 27 de Abril.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, cleanupOpenApiDoc(document));

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
