/**
 * Respaldo de gestionctp27_qa (solo QA). No toca producción.
 *
 * Uso:
 *   node scripts/qa/backup-qa.mjs
 *
 * Requiere pg_dump en PATH o en PostgreSQL 18 (Windows) y variables DB_* del .env.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DB = 'gestionctp27_qa';
const pgDumpCandidates = [
  process.env.PG_DUMP_PATH,
  'pg_dump',
  'C:/Program Files/PostgreSQL/18/bin/pg_dump.exe',
  'C:/Program Files/PostgreSQL/17/bin/pg_dump.exe',
  'C:/Program Files/PostgreSQL/16/bin/pg_dump.exe',
].filter(Boolean);

function resolverPgDump() {
  for (const candidato of pgDumpCandidates) {
    if (candidato === 'pg_dump') return candidato;
    if (fs.existsSync(candidato)) return candidato;
  }
  throw new Error('No se encontró pg_dump. Defina PG_DUMP_PATH.');
}

const outDir = path.resolve('backups/qa');
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = path.join(outDir, `${DB}_${stamp}.dump`);

const env = {
  ...process.env,
  PGPASSWORD: process.env.DB_PASSWORD,
  PGHOST: process.env.DB_HOST || '127.0.0.1',
  PGPORT: process.env.DB_PORT || '5432',
  PGUSER: process.env.DB_USERNAME || 'postgres',
};

const pgDump = resolverPgDump();
const result = spawnSync(
  pgDump,
  ['-Fc', '-d', DB, '-f', outFile],
  { env, encoding: 'utf8' },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      database: DB,
      file: outFile,
      bytes: fs.statSync(outFile).size,
    },
    null,
    2,
  ),
);
