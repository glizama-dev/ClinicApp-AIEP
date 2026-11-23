'use strict';

// Debe ir primero: fija las variables de entorno de pruebas.
const { TEST_DB_NAME } = require('./test-env');

const bcrypt = require('bcryptjs');

/* ===== Intercepcion de red: ningun correo real sale de las pruebas ===== */

const realFetch = global.fetch;
const BREVO_URL = 'https://api.brevo.com/';

const mail = {
  /** Cuerpos (JSON) de los correos que la app intento enviar por Brevo. */
  sent: [],
  /** Respuesta simulada de Brevo para el proximo envio. */
  status: 201,
  reset() {
    this.sent = [];
    this.status = 201;
  },
  /** Espera a que lleguen n correos (algunos envios son en segundo plano). */
  async waitFor(n = 1, timeoutMs = 3000) {
    const start = Date.now();
    while (this.sent.length < n) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Se esperaban ${n} correo(s) y llegaron ${this.sent.length}`);
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    return this.sent;
  },
};

global.fetch = async (url, options = {}) => {
  const u = String(url);
  if (u.startsWith(BREVO_URL)) {
    mail.sent.push(JSON.parse(options.body));
    const ok = mail.status >= 200 && mail.status < 300;
    return new Response(ok ? '{"messageId":"test"}' : '{"message":"error simulado"}', {
      status: mail.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (u.startsWith('http://127.0.0.1:') || u.startsWith('http://localhost:')) {
    return realFetch(url, options);
  }
  throw new Error(`Red externa bloqueada durante las pruebas: ${u}`);
};

/* ===== Servidor ===== */

const app = require('../src/app');
const { pool, query } = require('../src/db');

let server;
let baseUrl;

async function startServer() {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return baseUrl;
}

async function stopServer() {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
}

/**
 * Hace una peticion a la app de pruebas.
 * @returns {Promise<{status:number, body:any, text:string, headers:Headers}>}
 */
async function api(method, path, { body, token, headers = {}, rawBody } = {}) {
  const h = { ...headers };
  let payload = rawBody;
  if (body !== undefined) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  if (token) h.Authorization = `Bearer ${token}`;

  const res = await realFetch(baseUrl + path, { method, headers: h, body: payload });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, body: json, text, headers: res.headers };
}

/* ===== Limites de solicitudes ===== */

const limiters = require('../src/middleware/rateLimit');

/**
 * Reinicia los contadores de los limites por IP para el cliente de pruebas.
 * Se usa en archivos que hacen muchas solicitudes a una misma ruta; las
 * pruebas de los limites en si no lo llaman.
 */
async function resetRateLimits() {
  for (const limiter of Object.values(limiters)) {
    for (const key of ['127.0.0.1', '::ffff:127.0.0.1']) {
      await limiter.resetKey(key);
    }
  }
}

/* ===== Base de datos ===== */

/** Vacia todas las tablas (menos _migrations) de la base de datos de pruebas. */
async function resetDb() {
  const [{ db }] = await query('SELECT DATABASE() AS db');
  if (db !== TEST_DB_NAME) {
    throw new Error(`resetDb se nego a vaciar "${db}": solo opera sobre ${TEST_DB_NAME}`);
  }
  const tablas = await query(
    `SELECT table_name AS t FROM information_schema.tables
     WHERE table_schema = :db AND table_name <> '_migrations'`,
    { db }
  );
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { t } of tablas) await conn.query(`TRUNCATE TABLE \`${t}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
}

let contador = 0;

/**
 * Crea un usuario directo en la BD (sin pasar por /register, para no gastar
 * el limite de registros). Usa costo bcrypt bajo para que las pruebas sean
 * rapidas; el login funciona igual con cualquier costo.
 */
async function crearUsuario({
  nombre = 'Usuario Prueba',
  email,
  password = 'Prueba1234',
  rol = 'profesional',
  especialidad = 'podologia',
  estado = 'activo',
} = {}) {
  contador += 1;
  const correo = email || `usuario${contador}_${Date.now()}@ejemplo.cl`;
  const hash = await bcrypt.hash(password, 4);
  const result = await query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol, especialidad, estado, email_verificado_at)
     VALUES (:nombre, :email, :hash, :rol, :especialidad, :estado, NOW())`,
    { nombre, email: correo, hash, rol, especialidad, estado }
  );
  return { id: Number(result.insertId), email: correo, password, rol, especialidad };
}

async function login(email, password = 'Prueba1234') {
  const res = await api('POST', '/api/auth/login', { body: { email, password } });
  if (res.status !== 200) throw new Error(`login fallo (${res.status}): ${res.text}`);
  return res.body.token;
}

/** Crea un usuario y devuelve tambien su token de sesion. */
async function crearUsuarioConSesion(opts) {
  const usuario = await crearUsuario(opts);
  usuario.token = await login(usuario.email, usuario.password);
  return usuario;
}

/* ===== Datos de ejemplo ===== */

// PNG valido de 1x1 en base64.
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function fichaEjemplo(overrides = {}) {
  return {
    especialidad: 'podologia',
    fechaAtencion: '2026-11-20',
    estado: 'finalizada',
    paciente: {
      rut: '11111111-1',
      nombre: 'Paciente Prueba',
      fechaNacimiento: '1990-05-10',
      telefono: '+56911111111',
      email: 'paciente@ejemplo.cl',
    },
    datos: { motivoConsulta: 'Control', observaciones: 'Sin novedades' },
    firmas: { paciente: PNG_DATA_URL },
    fotos: [{ dataUrl: PNG_DATA_URL, descripcion: 'Antes' }],
    ...overrides,
  };
}

module.exports = {
  mail,
  startServer,
  stopServer,
  api,
  query,
  resetDb,
  resetRateLimits,
  crearUsuario,
  crearUsuarioConSesion,
  login,
  fichaEjemplo,
  PNG_DATA_URL,
};
