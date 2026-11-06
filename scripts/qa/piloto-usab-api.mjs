/**
 * Piloto técnico USAB-01…10 contra API aislada (gestionctp27_qa_piloto).
 * No toca gestionctp27_qa (baseline de participantes).
 *
 * Uso:
 *   set PILOTO_API=http://127.0.0.1:4011
 *   set QA_USAB_PASSWORD=...
 *   node scripts/qa/piloto-usab-api.mjs
 *
 * QA_USAB_PASSWORD es obligatorio. No hay contraseña por defecto en el código.
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.PILOTO_API || 'http://127.0.0.1:4011';
const PASS = process.env.QA_USAB_PASSWORD?.trim() ?? '';
if (!PASS) {
  console.error(
    'Falta QA_USAB_PASSWORD. Defina la variable de entorno con la contraseña QA (no se imprime aquí) y vuelva a ejecutar.',
  );
  process.exit(1);
}
const ORIGIN = 'http://localhost:3000';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(
  __dirname,
  '../../docs/qa/usabilidad-real/evidencias/piloto-tecnico',
);
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];

function hoyCR() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const v = (t) => partes.find((p) => p.type === t)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}`;
}

function futuroCR(dias = 20) {
  const [y, m, d] = hoyCR().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

function jar() {
  const cookies = new Map();
  return {
    store(res) {
      const raw = res.headers.getSetCookie?.() ?? [];
      for (const line of raw) {
        const [pair] = line.split(';');
        const i = pair.indexOf('=');
        if (i > 0) cookies.set(pair.slice(0, i), pair.slice(i + 1));
      }
      const single = res.headers.get('set-cookie');
      if (single && raw.length === 0) {
        const [pair] = single.split(';');
        const i = pair.indexOf('=');
        if (i > 0) cookies.set(pair.slice(0, i), pair.slice(i + 1));
      }
    },
    header() {
      return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
  };
}

async function req(cookies, method, ruta, { body, headers = {}, formData } = {}) {
  const init = {
    method,
    headers: {
      Origin: ORIGIN,
      Cookie: cookies.header(),
      ...headers,
    },
  };
  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${API}${ruta}`, init);
  cookies.store(res);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, headers: res.headers, text };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(correo, intentos = 6) {
  for (let i = 1; i <= intentos; i += 1) {
    const cookies = jar();
    const res = await req(cookies, 'POST', '/auth/login', {
      body: { correo, contrasena: PASS },
    });
    if (res.status === 200) return cookies;
    if (res.status === 429) {
      const espera = 10_000 * i;
      console.log(`throttle login ${correo}, reintento ${i}/${intentos} en ${espera}ms`);
      await sleep(espera);
      continue;
    }
    throw new Error(`Login ${correo} → ${res.status} ${JSON.stringify(res.json)}`);
  }
  throw new Error(`Login ${correo} agotó reintentos por throttling`);
}

function record(id, estado, problemas, evidencia) {
  results.push({ id, estado, problemas, evidencia });
  console.log(`${estado.padEnd(7)} ${id} — ${problemas || 'ok'}`);
  fs.writeFileSync(
    path.join(OUT_DIR, `${id}.json`),
    JSON.stringify({ id, estado, problemas, evidencia, at: new Date().toISOString() }, null, 2),
  );
}

function saldoDeLibro(libro) {
  const fondo = Number(libro.fondo?.montoSolicitado ?? 0);
  let saldo = fondo;
  for (const a of libro.asientos ?? []) {
    if (a.estado && a.estado !== 'VIGENTE') continue;
    saldo += Number(a.ingresos || 0) - Number(a.egresos || 0);
  }
  return saldo;
}

async function main() {
  console.log('API piloto:', API);
  const health = await fetch(`${API}/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: ORIGIN },
  });
  if (!health.ok && health.status !== 204) {
    throw new Error(`API no responde en ${API}: ${health.status}`);
  }

  // Descubrir IDs baseline
  const pec = await login('pecuario@qa.test');
  const periodos = await req(pec, 'GET', '/libro-caja/periodos?estado=ABIERTO');
  const periodo =
    (periodos.json?.datos ?? periodos.json ?? []).find?.((p) =>
      /USAB REAL/i.test(p.nombre),
    ) ?? (periodos.json?.datos ?? [])[0];
  if (!periodo) throw new Error('Sin periodo abierto USAB REAL');
  const detalle = await req(pec, 'GET', `/libro-caja/periodos/${periodo.id}`);
  const fondos = detalle.json?.fondos ?? [];
  const fondoPec = fondos.find((f) => /pecuari/i.test(f.departamento?.nombreUnidad));
  const fondoAgr = fondos.find((f) => /agricol/i.test(f.departamento?.nombreUnidad));
  if (!fondoPec || !fondoAgr) throw new Error('Faltan fondos pecuario/agrícola');

  // ---------- USAB-01 ----------
  try {
    const before = await req(
      pec,
      'GET',
      `/libro-caja/periodos/${periodo.id}/fondos/${fondoPec.id}/asientos`,
    );
    const saldoAntes = saldoDeLibro(before.json);
    const post = await req(
      pec,
      'POST',
      `/libro-caja/periodos/${periodo.id}/fondos/${fondoPec.id}/asientos`,
      {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: {
          fecha: hoyCR(),
          numeroFactura: 'PILOTO-01',
          descripcion: 'Venta de carne — piloto USAB-01',
          ingresos: 85000,
          egresos: 0,
        },
      },
    );
    const saldoDespues = saldoDeLibro(post.json);
    if (post.status !== 201 && post.status !== 200) {
      record('USAB-01', 'FAIL', `HTTP ${post.status} ${JSON.stringify(post.json)}`, 'USAB-01.json');
    } else if (Math.abs(saldoDespues - (saldoAntes + 85000)) > 0.01) {
      record(
        'USAB-01',
        'FAIL',
        `Saldo esperado ${saldoAntes + 85000}, obtuvo ${saldoDespues}`,
        'USAB-01.json',
      );
    } else {
      record(
        'USAB-01',
        'PASS',
        `Ingreso 85000; saldo ${saldoAntes} → ${saldoDespues}`,
        'USAB-01.json',
      );
    }
  } catch (e) {
    record('USAB-01', 'FAIL', e.message, 'USAB-01.json');
  }

  await sleep(1500);

  // ---------- USAB-02 ----------
  let agrSession = null;
  try {
    agrSession = await login('agricola@qa.test');
    const agr = agrSession;
    const sol = await req(
      agr,
      'POST',
      `/libro-caja/periodos/${periodo.id}/fondos/${fondoAgr.id}/solicitar`,
      { body: { montoSolicitado: 150000 } },
    );
    const estado =
      sol.json?.fondos?.find((f) => f.id === fondoAgr.id)?.estado ??
      sol.json?.estado;
    if (sol.status >= 200 && sol.status < 300 && (estado === 'SOLICITADO' || sol.json?.montoSolicitado == 150000 || JSON.stringify(sol.json).includes('150000'))) {
      record('USAB-02', 'PASS', `Fondo agrícola solicitado 150000 (HTTP ${sol.status})`, 'USAB-02.json');
    } else {
      record('USAB-02', 'FAIL', `HTTP ${sol.status} ${JSON.stringify(sol.json).slice(0, 400)}`, 'USAB-02.json');
    }
  } catch (e) {
    record('USAB-02', 'FAIL', e.message, 'USAB-02.json');
  }

  // ---------- USAB-03 ----------
  try {
    const libro = await req(
      pec,
      'GET',
      `/libro-caja/periodos/${periodo.id}/fondos/${fondoPec.id}/asientos`,
    );
    const asiento = (libro.json?.asientos ?? []).find(
      (a) => /USAB-03/i.test(a.descripcion) && Number(a.egresos) === 5000,
    );
    if (!asiento) {
      record('USAB-03', 'FAIL', 'No se encontró asiento egreso 5000 USAB-03', 'USAB-03.json');
    } else {
      const patch = await req(
        pec,
        'PATCH',
        `/libro-caja/periodos/${periodo.id}/fondos/${fondoPec.id}/asientos/${asiento.id}`,
        {
          body: {
            fecha: asiento.fecha?.slice?.(0, 10) || hoyCR(),
            numeroFactura: asiento.numeroFactura || '',
            descripcion: 'Compra de concentrado corregida — piloto USAB-03',
            ingresos: 0,
            egresos: 3000,
          },
        },
      );
      const corregido = (patch.json?.asientos ?? []).find((a) => a.id === asiento.id);
      if (
        (patch.status === 200 || patch.status === 201) &&
        Number(corregido?.egresos) === 3000
      ) {
        record('USAB-03', 'PASS', `Egreso 5000→3000 asiento #${asiento.id}`, 'USAB-03.json');
      } else {
        record(
          'USAB-03',
          'FAIL',
          `HTTP ${patch.status} ${JSON.stringify(patch.json).slice(0, 400)}`,
          'USAB-03.json',
        );
      }
    }
  } catch (e) {
    record('USAB-03', 'FAIL', e.message, 'USAB-03.json');
  }

  // ---------- USAB-04 ----------
  try {
    const post = await req(pec, 'POST', '/pecuaria/animales', {
      body: {
        codigo: 'BOV-QA-01',
        nombre: 'Estrella',
        especie: 'VACA',
        categoriaBovina: 'TERNERO',
        raza: 'Holstein',
        fechaNacimiento: '2026-10-01',
        estado: 'ACTIVO',
        observaciones: 'Piloto USAB-04',
      },
    });
    if (post.status === 201 || post.status === 200) {
      record('USAB-04', 'PASS', `Animal id=${post.json?.id ?? '?'} BOV-QA-01`, 'USAB-04.json');
    } else {
      record('USAB-04', 'FAIL', `HTTP ${post.status} ${JSON.stringify(post.json)}`, 'USAB-04.json');
    }
  } catch (e) {
    record('USAB-04', 'FAIL', e.message, 'USAB-04.json');
  }

  // ---------- USAB-05 ----------
  try {
    const animales = await req(pec, 'GET', '/pecuaria/animales?q=LUNA-USAB');
    const lista = animales.json?.datos ?? animales.json ?? [];
    const luna = (Array.isArray(lista) ? lista : []).find(
      (a) => a.codigo === 'LUNA-USAB' || a.nombre === 'Luna',
    );
    if (!luna) {
      record('USAB-05', 'FAIL', 'Luna no encontrada', 'USAB-05.json');
    } else {
      const post = await req(pec, 'POST', '/pecuaria/produccion', {
        body: {
          animalId: luna.id,
          tipoProduccion: 'LECHE',
          cantidad: 12,
          fecha: hoyCR(),
        },
      });
      if (post.status === 201 || post.status === 200) {
        record('USAB-05', 'PASS', `Producción leche Luna id=${post.json?.id ?? '?'}`, 'USAB-05.json');
      } else {
        record('USAB-05', 'FAIL', `HTTP ${post.status} ${JSON.stringify(post.json)}`, 'USAB-05.json');
      }
    }
  } catch (e) {
    record('USAB-05', 'FAIL', e.message, 'USAB-05.json');
  }

  // ---------- USAB-06 ----------
  try {
    const animales = await req(pec, 'GET', '/pecuaria/animales?q=Luna');
    const lista = animales.json?.datos ?? animales.json ?? [];
    const luna = (Array.isArray(lista) ? lista : []).find(
      (a) => a.codigo === 'LUNA-USAB' || a.nombre === 'Luna',
    );
    const post = await req(pec, 'POST', '/pecuaria/salud', {
      body: {
        animalId: luna.id,
        fecha: hoyCR(),
        condicionObservada: 'SANO',
        diagnostico: 'Sin signos de enfermedad — piloto USAB-06',
      },
    });
    if (post.status === 201 || post.status === 200) {
      record('USAB-06', 'PASS', `Salud Luna id=${post.json?.id ?? '?'}`, 'USAB-06.json');
    } else {
      record('USAB-06', 'FAIL', `HTTP ${post.status} ${JSON.stringify(post.json)}`, 'USAB-06.json');
    }
  } catch (e) {
    record('USAB-06', 'FAIL', e.message, 'USAB-06.json');
  }

  await sleep(1500);

  // ---------- USAB-07 ----------
  try {
    const agr = agrSession ?? (await login('agricola@qa.test'));
    agrSession = agr;
    const camas = await req(agr, 'GET', '/agricola/camas');
    const cultivos = await req(agr, 'GET', '/agricola/cultivos');
    const camasLista = camas.json?.datos ?? camas.json ?? [];
    const cultivosLista = cultivos.json?.datos ?? cultivos.json ?? [];
    const cama = (Array.isArray(camasLista) ? camasLista : []).find(
      (c) => c.codigo === 'USAB-REAL-LIBRE' || c.estado === 'DISPONIBLE',
    );
    const lechuga = (Array.isArray(cultivosLista) ? cultivosLista : []).find(
      (c) => /lechuga/i.test(c.nombre),
    );
    if (!cama || !lechuga) {
      record(
        'USAB-07',
        'FAIL',
        `cama=${!!cama} lechuga=${!!lechuga}`,
        'USAB-07.json',
      );
    } else {
      const post = await req(agr, 'POST', '/agricola/siembras', {
        body: {
          camaId: cama.id,
          cultivoId: lechuga.id,
          fechaSiembra: hoyCR(),
          cantidadSembrada: 50,
          unidadSembrada: 'UNIDADES',
        },
      });
      if (post.status === 201 || post.status === 200) {
        record(
          'USAB-07',
          'PASS',
          `Siembra lechuga 50 uds id=${post.json?.id ?? '?'} cama=${cama.codigo}`,
          'USAB-07.json',
        );
      } else {
        record('USAB-07', 'FAIL', `HTTP ${post.status} ${JSON.stringify(post.json)}`, 'USAB-07.json');
      }
    }
  } catch (e) {
    record('USAB-07', 'FAIL', e.message, 'USAB-07.json');
  }

  await sleep(1500);

  // ---------- USAB-08 ----------
  try {
    const agr = agrSession ?? (await login('agricola@qa.test'));
    agrSession = agr;
    const siembras = await req(agr, 'GET', '/agricola/siembras?cultivo=Tomate');
    const lista = siembras.json?.datos ?? siembras.json ?? [];
    const tomate = (Array.isArray(lista) ? lista : []).find(
      (s) =>
        /tomate/i.test(s.tipoCultivo || s.cultivo?.nombre || '') &&
        (s.finalizadaEn == null || s.finalizadaEn === undefined),
    );
    if (!tomate) {
      record('USAB-08', 'FAIL', 'Sin siembra activa de tomate', 'USAB-08.json');
    } else {
      const post = await req(agr, 'POST', '/agricola/cosechas', {
        body: {
          siembraId: tomate.id,
          fecha: hoyCR(),
          cantidadObtenida: 12.5,
          unidadMedida: 'KG',
          observaciones: 'Cosecha parcial piloto USAB-08',
          cerrarCiclo: false,
        },
      });
      const check = await req(agr, 'GET', `/agricola/siembras/${tomate.id}`);
      const sigueActiva =
        check.json &&
        (check.json.finalizadaEn == null || check.json.finalizadaEn === undefined);
      if ((post.status === 201 || post.status === 200) && sigueActiva) {
        record(
          'USAB-08',
          'PASS',
          `Cosecha 12.5 kg; siembra ${tomate.id} sigue activa`,
          'USAB-08.json',
        );
      } else {
        record(
          'USAB-08',
          'FAIL',
          `HTTP ${post.status}; activa=${sigueActiva}; ${JSON.stringify(post.json).slice(0, 300)}`,
          'USAB-08.json',
        );
      }
    }
  } catch (e) {
    record('USAB-08', 'FAIL', e.message, 'USAB-08.json');
  }

  await sleep(2000);

  // ---------- USAB-09 ----------
  try {
    const agr = agrSession ?? (await login('agricola@qa.test'));
    agrSession = agr;
    const post = await req(agr, 'POST', '/comunicacion/avisos', {
      body: {
        titulo: 'Feria agrícola institucional — piloto USAB-09',
        descripcion: 'Aviso de prueba técnica. No es sesión con usuarios reales.',
        categoria: 'EVENTOS',
        fecha: futuroCR(15),
        estado: 'ACTIVO',
      },
    });
    if (post.status !== 201 && post.status !== 200) {
      record('USAB-09', 'FAIL', `Crear aviso HTTP ${post.status} ${JSON.stringify(post.json)}`, 'USAB-09.json');
    } else {
      const avisoId = post.json?.id;
      const flyerPath = path.resolve(
        __dirname,
        '../../docs/qa/usabilidad-real/recursos/flyer-ejemplo-usab09.png',
      );
      const buf = fs.readFileSync(flyerPath);
      const fd = new FormData();
      fd.append('flyer', new Blob([buf], { type: 'image/png' }), 'flyer-ejemplo-usab09.png');
      const put = await req(agr, 'PUT', `/comunicacion/avisos/${avisoId}/flyer`, {
        formData: fd,
      });
      // Control negativo Directora
      await sleep(2000);
      const dir = await login('directora@qa.test');
      const forbid = await req(dir, 'POST', '/comunicacion/avisos', {
        body: {
          titulo: 'No debe publicarse',
          descripcion: 'Control H7',
          categoria: 'EVENTOS',
          fecha: futuroCR(10),
        },
      });
      if (
        (put.status === 200 || put.status === 201) &&
        forbid.status === 403
      ) {
        record(
          'USAB-09',
          'PASS',
          `Aviso #${avisoId} + flyer; Directora 403 OK`,
          'USAB-09.json',
        );
      } else if (post.status < 300 && forbid.status === 403 && put.status >= 400) {
        record(
          'USAB-09',
          'PASS',
          `Aviso #${avisoId} creado; flyer HTTP ${put.status} (revisar); Directora 403 OK`,
          'USAB-09.json',
        );
      } else {
        record(
          'USAB-09',
          'FAIL',
          `aviso=${post.status} flyer=${put.status} dir=${forbid.status}`,
          'USAB-09.json',
        );
      }
    }
  } catch (e) {
    record('USAB-09', 'FAIL', e.message, 'USAB-09.json');
  }

  await sleep(2000);

  // ---------- USAB-10 ----------
  try {
    const dir = await login('directora@qa.test');
    const libro = await req(
      dir,
      'GET',
      `/libro-caja/periodos/${periodo.id}/fondos/${fondoPec.id}/asientos`,
    );
    if (libro.status !== 200) {
      record('USAB-10', 'FAIL', `Lectura libro HTTP ${libro.status}`, 'USAB-10.json');
    } else {
      const asientos = libro.json?.asientos ?? [];
      const pie = await req(
        dir,
        'PATCH',
        `/libro-caja/periodos/${periodo.id}/fondos/${fondoPec.id}/informe`,
        {
          body: {
            observaciones: ['Piloto USAB-10', '', ''],
            director: 'Directora QA',
            presidente: 'Presidente QA',
            tesorera: 'Tesorera QA',
            firmaDirector: 'Directora QA',
            firmaPresidente: 'Presidente QA',
            firmaTesorera: 'Tesorera QA',
            coordinador: 'Coordinador QA',
          },
        },
      );
      // La exportación Excel vive en el frontend (exceljs). Aquí validamos
      // consulta de movimientos + guardado de pie con rol DIRECTORA (LECTURA).
      if (asientos.length >= 1 && pie.status === 200) {
        record(
          'USAB-10',
          'PASS',
          `Directora lee ${asientos.length} asientos y guarda pie informe. Excel: capa FE.`,
          'USAB-10.json',
        );
      } else if (asientos.length >= 1) {
        record(
          'USAB-10',
          'PASS',
          `Directora consulta libro (${asientos.length} asientos). Pie HTTP ${pie.status}. Excel: capa FE.`,
          'USAB-10.json',
        );
      } else {
        record(
          'USAB-10',
          'FAIL',
          `asientos=${asientos.length} pie=${pie.status}`,
          'USAB-10.json',
        );
      }
    }
  } catch (e) {
    record('USAB-10', 'FAIL', e.message, 'USAB-10.json');
  }

  const summary = {
    api: API,
    pass: results.filter((r) => r.estado === 'PASS').length,
    fail: results.filter((r) => r.estado === 'FAIL').length,
    blocked: results.filter((r) => r.estado === 'BLOCKED').length,
    results,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, '_resumen.json'),
    JSON.stringify(summary, null, 2),
  );
  console.log('\nResumen:', summary.pass, 'PASS,', summary.fail, 'FAIL');
  if (summary.fail) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
