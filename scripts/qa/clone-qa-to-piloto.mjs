/**
 * Clona gestionctp27_qa → gestionctp27_qa_piloto desde el dump más reciente.
 * No modifica la BD baseline de participantes.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const SOURCE = 'gestionctp27_qa';
const TARGET = 'gestionctp27_qa_piloto';
const bin = 'C:/Program Files/PostgreSQL/18/bin';

const env = {
  ...process.env,
  PGPASSWORD: process.env.DB_PASSWORD,
  PGHOST: process.env.DB_HOST || '127.0.0.1',
  PGPORT: process.env.DB_PORT || '5432',
  PGUSER: process.env.DB_USERNAME || 'postgres',
};

function run(cmd, args) {
  const r = spawnSync(cmd, args, { env, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error(`${cmd} falló con código ${r.status}`);
  }
  return r;
}

const outDir = path.resolve('backups/qa');
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dump = path.join(outDir, `${SOURCE}_pre-piloto_${stamp}.dump`);

console.log('1) Dump de', SOURCE, '→', dump);
run(path.join(bin, 'pg_dump.exe'), ['-Fc', '-d', SOURCE, '-f', dump]);

const admin = new pg.Client({
  host: env.PGHOST,
  port: Number(env.PGPORT),
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: 'postgres',
});
await admin.connect();
await admin.query(
  `SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE datname = $1 AND pid <> pg_backend_pid()`,
  [TARGET],
);
await admin.query(`DROP DATABASE IF EXISTS ${TARGET}`);
await admin.query(`CREATE DATABASE ${TARGET}`);
await admin.end();

console.log('2) Restore →', TARGET);
run(path.join(bin, 'pg_restore.exe'), [
  '-d',
  TARGET,
  '--no-owner',
  '--no-acl',
  dump,
]);

const check = new pg.Client({
  host: env.PGHOST,
  port: Number(env.PGPORT),
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: TARGET,
});
await check.connect();
const periodo = await check.query(
  `SELECT id, nombre FROM periodos_caja WHERE estado::text = 'ABIERTO'`,
);
const bov = await check.query(
  `SELECT count(*)::int AS n FROM animales WHERE codigo = 'BOV-QA-01'`,
);
const cama = await check.query(
  `SELECT estado FROM camas_cultivo WHERE codigo = 'USAB-REAL-LIBRE'`,
);
console.log(
  JSON.stringify(
    {
      ok: true,
      dump,
      periodo: periodo.rows[0],
      bovQa01Libre: bov.rows[0].n === 0,
      camaLibre: cama.rows[0],
    },
    null,
    2,
  ),
);
await check.end();
