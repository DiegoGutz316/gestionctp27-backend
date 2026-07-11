import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './database.config';

/**
 * DataSource para la CLI de TypeORM (migraciones).
 * Se usa con los scripts de package.json:
 *   pnpm migration:generate src/database/migrations/NombreDeLaMigracion
 *   pnpm migration:run
 *   pnpm migration:revert
 */
export default new DataSource({
  ...buildDatabaseOptions((key) => process.env[key]),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
