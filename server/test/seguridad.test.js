'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

before(async () => {
  await h.startServer();
  await h.resetDb();
});
after(h.stopServer);

describe('Cabeceras de seguridad', () => {
  test('incluye Content-Security-Policy restrictiva', async () => {
    const res = await h.api('GET', '/');
    const csp = res.headers.get('content-security-policy');
    assert.ok(csp, 'falta la cabecera CSP');
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
  });

  test('no revela la tecnologia del servidor (X-Powered-By)', async () => {
    const res = await h.api('GET', '/api/health');
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  test('impide que el navegador adivine tipos de archivo', async () => {
    const res = await h.api('GET', '/');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });
});

describe('Archivos expuestos', () => {
  test('no sirve el codigo del backend', async () => {
    for (const ruta of ['/server/src/config.js', '/server/package.json', '/server/']) {
      const res = await h.api('GET', ruta);
      assert.equal(res.status, 404, ruta);
    }
  });

  test('no sirve archivos ocultos como .env', async () => {
    const res = await h.api('GET', '/.env');
    assert.equal(res.status, 404);
    assert.ok(!res.text.includes('JWT_SECRET'));
  });

  test('sirve las paginas publicas, incluidas las legales', async () => {
    for (const ruta of ['/', '/privacidad.html', '/terminos.html', '/img/favicon.svg']) {
      const res = await h.api('GET', ruta);
      assert.equal(res.status, 200, ruta);
    }
  });
});

describe('Manejo de errores', () => {
  test('un JSON mal formado responde 400 sin detalles internos', async () => {
    const res = await h.api('POST', '/api/auth/login', {
      rawBody: '{"email": ',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'JSON_INVALIDO');
    assert.ok(!res.text.includes('at '), 'no debe exponer trazas de error');
  });

  test('una ruta de API inexistente responde 404 en JSON', async () => {
    const res = await h.api('GET', '/api/no-existe');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NO_ENCONTRADO');
  });

  test('un intento de inyeccion SQL en el login no funciona', async () => {
    await h.crearUsuario({ email: 'victima@ejemplo.cl' });
    const res = await h.api('POST', '/api/auth/login', {
      body: { email: "victima@ejemplo.cl' OR '1'='1", password: "' OR '1'='1" },
    });
    assert.ok([400, 401].includes(res.status), `status inesperado ${res.status}`);
    assert.equal(res.body.token, undefined);
  });
});

describe('Limites de intentos', () => {
  test('bloquea la cuenta tras 10 intentos fallidos de inicio de sesion', async () => {
    const usuario = await h.crearUsuario();
    for (let i = 0; i < 10; i += 1) {
      const res = await h.api('POST', '/api/auth/login', {
        body: { email: usuario.email, password: `Incorrecta${i}` },
      });
      assert.equal(res.status, 401);
    }
    // Incluso con la contrasena correcta, la cuenta queda bloqueada temporalmente.
    const bloqueado = await h.api('POST', '/api/auth/login', {
      body: { email: usuario.email, password: usuario.password },
    });
    assert.equal(bloqueado.status, 429);
  });
});
