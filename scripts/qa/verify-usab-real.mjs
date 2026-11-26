/**
 * Verificación previa (solo lectura) del estado USAB REAL en gestionctp27_qa.
 * No ejecuta las tareas de los participantes ni modifica datos.
 *
 * Uso: node scripts/qa/verify-usab-real.mjs
 */
import 'dotenv/config';
import pg from 'pg';

const DB = 'gestionctp27_qa';
const checks = [];

function ok(id, detalle) {
  checks.push({ id, estado: 'PASS', detalle });
  console.log(`PASS  ${id} — ${detalle}`);
}
function fail(id, detalle) {
  checks.push({ id, estado: 'FAIL', detalle });
  console.error(`FAIL  ${id} — ${detalle}`);
}

const client = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: DB,
  ssl: false,
});

await client.connect();
const db = (await client.query('SELECT current_database() AS d')).rows[0].d;
if (db !== DB) {
  fail('DB', `Conectado a ${db}`);
  process.exit(1);
}
ok('DB', db);

const mig = await client.query(
  `SELECT 1 FROM migrations WHERE name LIKE '%AnulacionLogicaAsientos%'`,
);
mig.rowCount
  ? ok('MIG-H1', 'AnulacionLogicaAsientos presente')
  : fail('MIG-H1', 'Falta migración de anulación lógica');

const periodo = await client.query(
  `SELECT id, nombre FROM periodos_caja WHERE estado::text='ABIERTO'`,
);
periodo.rows.length === 1 && /USAB REAL/i.test(periodo.rows[0].nombre)
  ? ok('PERIODO', `#${periodo.rows[0].id} ${periodo.rows[0].nombre}`)
  : fail('PERIODO', JSON.stringify(periodo.rows));

const fondos = await client.query(
  `SELECT d.nombre_unidad, f.estado::text, f.monto_solicitado::float8 AS monto, f.id
   FROM fondos_caja f JOIN departamentos_caja d ON d.id=f.departamento_id
   WHERE f.periodo_id=$1`,
  [periodo.rows[0]?.id],
);
const pec = fondos.rows.find((f) => /pecuari/i.test(f.nombre_unidad));
const agr = fondos.rows.find((f) => /agricol/i.test(f.nombre_unidad));
pec?.estado === 'SOLICITADO' && pec.monto === 200000
  ? ok('FONDO-PEC', `id=${pec.id} SOLICITADO 200000`)
  : fail('FONDO-PEC', JSON.stringify(pec));
agr?.estado === 'PENDIENTE'
  ? ok('FONDO-AGR', `id=${agr.id} PENDIENTE`)
  : fail('FONDO-AGR', JSON.stringify(agr));

const asientos = await client.query(
  `SELECT numero, ingresos::float8 AS i, egresos::float8 AS e, descripcion, estado
   FROM asientos_caja WHERE fondo_id=$1 ORDER BY numero`,
  [pec?.id],
);
asientos.rows.length === 1 &&
asientos.rows[0].e === 5000 &&
asientos.rows[0].estado === 'VIGENTE'
  ? ok('USAB-03-ASIENTO', asientos.rows[0].descripcion)
  : fail('USAB-03-ASIENTO', JSON.stringify(asientos.rows));

const bov = await client.query(
  `SELECT id FROM animales WHERE codigo='BOV-QA-01'`,
);
bov.rowCount === 0
  ? ok('BOV-QA-01', 'código libre')
  : fail('BOV-QA-01', 'código ocupado');

const luna = await client.query(
  `SELECT id, especie, categoria_bovina, estado FROM animales WHERE codigo='LUNA-USAB'`,
);
luna.rows[0]?.especie === 'VACA' &&
luna.rows[0]?.categoria_bovina === 'VACA' &&
luna.rows[0]?.estado === 'ACTIVO'
  ? ok('LUNA', `id=${luna.rows[0].id}`)
  : fail('LUNA', JSON.stringify(luna.rows));

const camaLibre = await client.query(
  `SELECT estado FROM camas_cultivo WHERE codigo='USAB-REAL-LIBRE'`,
);
camaLibre.rows[0]?.estado === 'DISPONIBLE'
  ? ok('CAMA-LIBRE', 'USAB-REAL-LIBRE DISPONIBLE')
  : fail('CAMA-LIBRE', JSON.stringify(camaLibre.rows));

const tomate = await client.query(
  `SELECT s.id FROM siembras s
   JOIN camas_cultivo c ON c.id=s.cama_id
   WHERE c.codigo='USAB-TOMATE' AND s.finalizada_en IS NULL AND s.tipo_cultivo ILIKE 'tomate%'`,
);
tomate.rowCount > 0
  ? ok('SIEMBRA-TOMATE', `id=${tomate.rows[0].id}`)
  : fail('SIEMBRA-TOMATE', 'sin siembra activa');

const cultivos = await client.query(
  `SELECT nombre FROM cultivos WHERE activo AND nombre_normalizado IN ('lechuga','tomate')`,
);
cultivos.rowCount === 2
  ? ok('CULTIVOS', cultivos.rows.map((r) => r.nombre).join(', '))
  : fail('CULTIVOS', JSON.stringify(cultivos.rows));

const roles = await client.query(
  `SELECT correo, rol::text FROM usuarios
   WHERE correo IN ('pecuario@qa.test','agricola@qa.test','directora@qa.test','admin@qa.test')
   AND activo`,
);
roles.rowCount === 4
  ? ok('USERS', roles.rows.map((r) => `${r.correo}=${r.rol}`).join(' | '))
  : fail('USERS', JSON.stringify(roles.rows));

const dirRep = await client.query(
  `SELECT nivel::text FROM permisos_rol WHERE rol::text='DIRECTORA' AND modulo::text='REPORTES'`,
);
dirRep.rows[0]?.nivel === 'LECTURA'
  ? ok('H7-DIRECTORA', 'REPORTES=LECTURA')
  : fail('H7-DIRECTORA', JSON.stringify(dirRep.rows));

const docRep = await client.query(
  `SELECT rol::text, nivel::text FROM permisos_rol
   WHERE modulo::text='REPORTES' AND rol::text IN ('DOCENTE_PECUARIO','DOCENTE_AGRICOLA')`,
);
docRep.rows.every((r) => r.nivel === 'COMPLETO')
  ? ok('AVISOS-DOCENTES', 'REPORTES=COMPLETO')
  : fail('AVISOS-DOCENTES', JSON.stringify(docRep.rows));

await client.end();

const fails = checks.filter((c) => c.estado === 'FAIL').length;
console.log(`\nResumen: ${checks.length - fails} PASS, ${fails} FAIL`);
process.exit(fails ? 1 : 0);
