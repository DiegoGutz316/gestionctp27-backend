/**
 * Prepara el estado inicial de usabilidad REAL en gestionctp27_qa.
 *
 * - Solo opera si current_database() === 'gestionctp27_qa'
 * - No modifica producción (gestionctp27 / remoto)
 * - Es idempotente: puede reejecutarse entre participantes
 *
 * Uso:
 *   node scripts/qa/prepare-usab-real.mjs
 *
 * Opcional:
 *   QA_USAB_PASSWORD=...  → restablece contraseñas de *@qa.test
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';

const DB_ESPERADA = 'gestionctp27_qa';
const PERIODO_NOMBRE = 'USAB REAL — Evaluación';
const FONDO_PECUARIO = 200_000;
const EGRESO_USAB03 = 5_000;
const CAMA_LIBRE = 'USAB-REAL-LIBRE';
const CAMA_TOMATE = 'USAB-TOMATE';
const CODIGO_TERNERA = 'BOV-QA-01';
const CODIGO_LUNA = 'LUNA-USAB';

const client = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: DB_ESPERADA,
  ssl: false,
});

function log(paso, detalle) {
  console.log(`✔ ${paso}${detalle ? `: ${detalle}` : ''}`);
}

async function main() {
  await client.connect();
  const db = (await client.query('SELECT current_database() AS d')).rows[0].d;
  if (db !== DB_ESPERADA) {
    throw new Error(`Abortado: conectado a "${db}", se esperaba "${DB_ESPERADA}".`);
  }
  log('BD confirmada', db);

  await client.query('BEGIN');
  try {
    const admin = (
      await client.query(
        `SELECT id FROM usuarios WHERE correo = 'admin@qa.test' LIMIT 1`,
      )
    ).rows[0];
    if (!admin) throw new Error('Falta admin@qa.test en QA.');
    const adminId = admin.id;

    // --- Departamentos ---
    const deps = await client.query(
      `SELECT id, nombre_unidad FROM departamentos_caja WHERE activo = true ORDER BY id`,
    );
    const pecuario = deps.rows.find((d) =>
      /pecuari/i.test(d.nombre_unidad),
    );
    const agricola = deps.rows.find((d) =>
      /agricol/i.test(d.nombre_unidad),
    );
    if (!pecuario || !agricola) {
      throw new Error('Se requieren departamentos pecuario y agrícola activos.');
    }
    log('Departamentos', `${pecuario.nombre_unidad} / ${agricola.nombre_unidad}`);

    // --- Periodo abierto único ---
    const abiertos = await client.query(
      `SELECT id, nombre FROM periodos_caja WHERE estado::text = 'ABIERTO'`,
    );
    let periodoId;
    if (abiertos.rows.length === 0) {
      const creado = await client.query(
        `INSERT INTO periodos_caja (nombre, fecha_inicio, fecha_fin, estado, creado_por)
         VALUES ($1, '2026-11-01', '2026-12-31', 'ABIERTO', $2)
         RETURNING id`,
        [PERIODO_NOMBRE, adminId],
      );
      periodoId = creado.rows[0].id;
      for (const dep of [pecuario, agricola]) {
        await client.query(
          `INSERT INTO fondos_caja (periodo_id, departamento_id, estado, monto_solicitado)
           VALUES ($1, $2, 'PENDIENTE', NULL)`,
          [periodoId, dep.id],
        );
      }
      log('Periodo creado', `${PERIODO_NOMBRE} (#${periodoId})`);
    } else {
      periodoId = abiertos.rows[0].id;
      await client.query(
        `UPDATE periodos_caja SET nombre = $1, actualizado_en = now() WHERE id = $2`,
        [PERIODO_NOMBRE, periodoId],
      );
      log('Periodo abierto reutilizado', `#${periodoId}`);
    }

    // Asegurar fondos de ambos departamentos
    async function asegurarFondo(departamentoId) {
      const existente = await client.query(
        `SELECT id FROM fondos_caja WHERE periodo_id = $1 AND departamento_id = $2`,
        [periodoId, departamentoId],
      );
      if (existente.rows[0]) return existente.rows[0].id;
      const ins = await client.query(
        `INSERT INTO fondos_caja (periodo_id, departamento_id, estado, monto_solicitado)
         VALUES ($1, $2, 'PENDIENTE', NULL) RETURNING id`,
        [periodoId, departamentoId],
      );
      return ins.rows[0].id;
    }

    const fondoPecuarioId = await asegurarFondo(pecuario.id);
    const fondoAgricolaId = await asegurarFondo(agricola.id);

    // Limpiar asientos del fondo pecuario (y claves de idempotencia)
    await client.query(
      `UPDATE idempotencia_asientos SET asiento_id = NULL
       WHERE asiento_id IN (SELECT id FROM asientos_caja WHERE fondo_id = $1)`,
      [fondoPecuarioId],
    );
    await client.query(`DELETE FROM asientos_caja WHERE fondo_id = $1`, [
      fondoPecuarioId,
    ]);
    await client.query(`DELETE FROM asientos_caja WHERE fondo_id = $1`, [
      fondoAgricolaId,
    ]);

    // Pecuaria: fondo solicitado ₡200.000 + egreso ₡5.000 para USAB-03
    await client.query(
      `UPDATE fondos_caja
       SET estado = 'SOLICITADO',
           monto_solicitado = $2,
           solicitado_en = COALESCE(solicitado_en, now()),
           solicitado_por = COALESCE(solicitado_por, $3),
           actualizado_en = now()
       WHERE id = $1`,
      [fondoPecuarioId, FONDO_PECUARIO, adminId],
    );
    await client.query(
      `INSERT INTO asientos_caja
         (fondo_id, numero, fecha, numero_factura, descripcion, ingresos, egresos, estado, creado_por)
       VALUES
         ($1, 1, CURRENT_DATE, '', 'Compra de concentrado (registro de prueba USAB-03)', 0, $2, 'VIGENTE', $3)`,
      [fondoPecuarioId, EGRESO_USAB03, adminId],
    );
    log(
      'Libro pecuario',
      `fondo #${fondoPecuarioId} SOLICITADO ${FONDO_PECUARIO}; egreso ${EGRESO_USAB03} listo para corregir`,
    );

    // Agrícola: PENDIENTE para USAB-02
    await client.query(
      `UPDATE fondos_caja
       SET estado = 'PENDIENTE',
           monto_solicitado = NULL,
           solicitado_en = NULL,
           solicitado_por = NULL,
           pie_informe = NULL,
           actualizado_en = now()
       WHERE id = $1`,
      [fondoAgricolaId],
    );
    log('Libro agrícola', `fondo #${fondoAgricolaId} PENDIENTE (USAB-02)`);

    // --- Animales ---
    // Liberar BOV-QA-01 si está ocupado por otra ficha
    const ocupado = await client.query(
      `SELECT id, nombre FROM animales WHERE codigo = $1`,
      [CODIGO_TERNERA],
    );
    if (ocupado.rows[0] && ocupado.rows[0].nombre !== 'Estrella-ARCH') {
      const nuevoCodigo = `BOV-QA-ARCH-${ocupado.rows[0].id}`;
      await client.query(`UPDATE animales SET codigo = $1 WHERE id = $2`, [
        nuevoCodigo,
        ocupado.rows[0].id,
      ]);
      log('Código liberado', `${CODIGO_TERNERA} ← era #${ocupado.rows[0].id}, ahora ${nuevoCodigo}`);
    }

    // Luna lista para leche/salud
    const luna = await client.query(
      `SELECT id FROM animales WHERE codigo = $1`,
      [CODIGO_LUNA],
    );
    if (luna.rows[0]) {
      await client.query(
        `UPDATE animales
         SET nombre = 'Luna',
             especie = 'VACA',
             categoria_bovina = 'VACA',
             raza = 'Holstein',
             estado = 'ACTIVO',
             actualizado_en = now(),
             actualizado_por = $2
         WHERE id = $1`,
        [luna.rows[0].id, adminId],
      );
      log('Luna actualizada', `id=${luna.rows[0].id}`);
    } else {
      const ins = await client.query(
        `INSERT INTO animales
           (codigo, nombre, especie, categoria_bovina, raza, fecha_nacimiento, estado, observaciones, creado_por)
         VALUES
           ($1, 'Luna', 'VACA', 'VACA', 'Holstein', '2022-05-10', 'ACTIVO', 'Animal base USAB-05/06', $2)
         RETURNING id`,
        [CODIGO_LUNA, adminId],
      );
      log('Luna creada', `id=${ins.rows[0].id}`);
    }

    // Desactivar Lunas de sonda para no confundir
    await client.query(
      `UPDATE animales
       SET estado = 'INACTIVO', actualizado_en = now(), actualizado_por = $1
       WHERE nombre ILIKE 'Luna %' AND codigo <> $2`,
      [adminId, CODIGO_LUNA],
    );

    // --- Agrícola: cultivos, cama libre, siembra tomate ---
    const lechuga = await client.query(
      `SELECT id FROM cultivos WHERE nombre_normalizado = 'lechuga' AND activo = true LIMIT 1`,
    );
    const tomate = await client.query(
      `SELECT id FROM cultivos WHERE nombre_normalizado = 'tomate' AND activo = true LIMIT 1`,
    );
    if (!lechuga.rows[0] || !tomate.rows[0]) {
      throw new Error('Faltan cultivos activos Lechuga y/o Tomate.');
    }

    let camaLibre = await client.query(
      `SELECT id FROM camas_cultivo WHERE codigo = $1`,
      [CAMA_LIBRE],
    );
    if (!camaLibre.rows[0]) {
      camaLibre = await client.query(
        `INSERT INTO camas_cultivo (codigo, ubicacion, estado, observaciones, creado_por)
         VALUES ($1, 'Invernadero 1', 'DISPONIBLE', 'Cama libre para USAB-07', $2)
         RETURNING id`,
        [CAMA_LIBRE, adminId],
      );
      log('Cama libre creada', CAMA_LIBRE);
    } else {
      // Si tiene siembra abierta, finalizarla para liberar
      await client.query(
        `UPDATE siembras
         SET finalizada_en = CURRENT_DATE,
             motivo_finalizacion = 'OTRO',
             motivo_detalle = 'Liberada para USAB-REAL'
         WHERE cama_id = $1 AND finalizada_en IS NULL`,
        [camaLibre.rows[0].id],
      );
      await client.query(
        `UPDATE camas_cultivo SET estado = 'DISPONIBLE', actualizado_en = now(), actualizado_por = $2
         WHERE id = $1`,
        [camaLibre.rows[0].id, adminId],
      );
      log('Cama libre asegurada', CAMA_LIBRE);
    }

    let camaTomate = await client.query(
      `SELECT id, estado FROM camas_cultivo WHERE codigo = $1`,
      [CAMA_TOMATE],
    );
    if (!camaTomate.rows[0]) {
      camaTomate = await client.query(
        `INSERT INTO camas_cultivo (codigo, ubicacion, estado, observaciones, creado_por)
         VALUES ($1, 'Invernadero 1', 'SEMBRADA', 'Siembra tomate USAB-08', $2)
         RETURNING id, estado`,
        [CAMA_TOMATE, adminId],
      );
    }

    const siembraTomate = await client.query(
      `SELECT id FROM siembras WHERE cama_id = $1 AND finalizada_en IS NULL ORDER BY id DESC LIMIT 1`,
      [camaTomate.rows[0].id],
    );
    if (!siembraTomate.rows[0]) {
      await client.query(
        `INSERT INTO siembras
           (cama_id, cultivo_id, tipo_cultivo, fecha_siembra, cantidad_sembrada, unidad_sembrada, creado_por)
         VALUES ($1, $2, 'Tomate', CURRENT_DATE - 14, 20, 'UNIDADES', $3)`,
        [camaTomate.rows[0].id, tomate.rows[0].id, adminId],
      );
      await client.query(
        `UPDATE camas_cultivo SET estado = 'SEMBRADA', actualizado_en = now() WHERE id = $1`,
        [camaTomate.rows[0].id],
      );
      log('Siembra de tomate creada', CAMA_TOMATE);
    } else {
      log('Siembra de tomate activa', `id=${siembraTomate.rows[0].id}`);
    }

    // Contraseñas QA (opcional)
    if (process.env.QA_USAB_PASSWORD) {
      const hash = await bcrypt.hash(process.env.QA_USAB_PASSWORD, 12);
      const upd = await client.query(
        `UPDATE usuarios SET contrasena_hash = $1, actualizado_en = now()
         WHERE correo LIKE '%@qa.test' AND activo = true`,
        [hash],
      );
      log('Contraseñas QA actualizadas', `${upd.rowCount} usuarios @qa.test`);
    } else {
      log(
        'Contraseñas',
        'sin cambio (defina QA_USAB_PASSWORD para restablecer *@qa.test)',
      );
    }

    await client.query('COMMIT');

    const resumen = {
      database: DB_ESPERADA,
      periodo: { id: periodoId, nombre: PERIODO_NOMBRE },
      fondos: {
        pecuario: {
          id: fondoPecuarioId,
          estado: 'SOLICITADO',
          monto: FONDO_PECUARIO,
          saldoTrasEgresoUsab03: FONDO_PECUARIO - EGRESO_USAB03,
        },
        agricola: { id: fondoAgricolaId, estado: 'PENDIENTE' },
      },
      animales: {
        lunaCodigo: CODIGO_LUNA,
        codigoTerneraLibre: CODIGO_TERNERA,
      },
      agricola: {
        camaLibre: CAMA_LIBRE,
        camaTomate: CAMA_TOMATE,
        cultivos: ['Lechuga', 'Tomate'],
      },
      usuariosQa: [
        'admin@qa.test',
        'pecuario@qa.test',
        'agricola@qa.test',
        'directora@qa.test',
      ],
    };
    console.log('\nEstado inicial listo:');
    console.log(JSON.stringify(resumen, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('✖ prepare-usab-real falló:', error.message);
  process.exit(1);
});
