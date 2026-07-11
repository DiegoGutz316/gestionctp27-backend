import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
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

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
