import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * DataSource para la CLI de TypeORM (migraciones).
 * Se usa con los scripts de package.json:
 *   pnpm migration:generate src/migrations/NombreDeLaMigracion
 *   pnpm migration:run
 *   pnpm migration:revert
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'gestionctp27',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
