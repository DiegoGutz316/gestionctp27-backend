import { DataSourceOptions } from 'typeorm';

/**
 * Opciones de conexión a PostgreSQL compartidas entre la aplicación
 * (app.module.ts) y la CLI de TypeORM (data-source.ts).
 *
 * Dos formas de configurar la conexión (ver .env.example):
 *  - DATABASE_URL: cadena de conexión completa (recomendado para Supabase).
 *  - DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME: variables sueltas.
 *
 * DB_SSL=true habilita SSL, obligatorio en bases remotas como Supabase.
 */
export function buildDatabaseOptions(
  get: (key: string) => string | undefined,
): DataSourceOptions {
  const ssl = get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false;
  const url = get('DATABASE_URL');

  if (url) {
    return { type: 'postgres', url, ssl, synchronize: false };
  }

  return {
    type: 'postgres',
    host: get('DB_HOST') ?? 'localhost',
    port: parseInt(get('DB_PORT') ?? '5432', 10),
    username: get('DB_USERNAME') ?? 'postgres',
    password: get('DB_PASSWORD') ?? '',
    database: get('DB_NAME') ?? 'gestionctp27',
    ssl,
    synchronize: false,
  };
}
