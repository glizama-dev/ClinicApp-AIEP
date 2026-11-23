'use strict';

const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const h = require('./helpers');

before(async () => {
  await h.startServer();
  await h.resetDb();
});
after(h.stopServer);
beforeEach(async () => {
  h.mail.reset();
  await h.resetRateLimits();
});

/** Pide recuperacion y devuelve el token que llego en el correo (interceptado). */
async function pedirToken(email) {
  const res = await h.api('POST', '/api/auth/forgot-password', { body: { email } });
  assert.equal(res.status, 200);
  const [correo] = await h.mail.waitFor(1);
  const match = /reset-password\.html#token=([a-f0-9]{64})/.exec(correo.htmlContent);
  assert.ok(match, 'el correo debe traer el enlace con el token');
  return { token: match[1], correo, res };
}

describe('Recuperacion de contrasena', () => {
  test('envia el enlace al correo de un profesional (correo no institucional)', async () => {
    const usuario = await h.crearUsuario({ email: 'profesional.reset@gmail.com' });
    const { correo } = await pedirToken(usuario.email);

    assert.deepEqual(correo.to, [{ email: 'profesional.reset@gmail.com' }]);
    assert.match(correo.htmlContent, /^[\s\S]*http:\/\/clinicapp\.test\/reset-password\.html#token=/);
  });

  test('envia el enlace al correo institucional de un estudiante', async () => {
    const usuario = await h.crearUsuario({
      rol: 'estudiante',
      email: 'alumno.reset@correoaiep.cl',
    });
    const { correo } = await pedirToken(usuario.email);
    assert.deepEqual(correo.to, [{ email: 'alumno.reset@correoaiep.cl' }]);
  });

  test('con un correo no registrado responde igual pero no envia nada', async () => {
    const usuario = await h.crearUsuario();
    const existe = await h.api('POST', '/api/auth/forgot-password', { body: { email: usuario.email } });
    await h.mail.waitFor(1);
    h.mail.reset();

    const noExiste = await h.api('POST', '/api/auth/forgot-password', {
      body: { email: 'no.registrado@ejemplo.cl' },
    });
    await new Promise((r) => setTimeout(r, 200));

    assert.equal(noExiste.status, 200);
    assert.equal(noExiste.body.message, existe.body.message, 'no debe revelar si el correo existe');
    assert.equal(h.mail.sent.length, 0);
  });

  test('el token se guarda cifrado en la base de datos, no en texto plano', async () => {
    const usuario = await h.crearUsuario();
    const { token } = await pedirToken(usuario.email);
    const filas = await h.query('SELECT token_hash FROM password_resets WHERE usuario_id = :id', {
      id: usuario.id,
    });
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    assert.ok(filas.some((f) => f.token_hash === hash));
    assert.ok(filas.every((f) => f.token_hash !== token));
  });

  test('flujo completo: cambia la contrasena, cierra sesiones y el enlace no se reutiliza', async () => {
    const usuario = await h.crearUsuarioConSesion();
    const { token } = await pedirToken(usuario.email);

    const reset = await h.api('POST', '/api/auth/reset-password', {
      body: { token, password: 'NuevaClave456' },
    });
    assert.equal(reset.status, 200);

    // La sesion abierta antes del cambio ya no sirve.
    const me = await h.api('GET', '/api/auth/me', { token: usuario.token });
    assert.equal(me.status, 401);

    // La contrasena antigua ya no funciona y la nueva si.
    const vieja = await h.api('POST', '/api/auth/login', {
      body: { email: usuario.email, password: usuario.password },
    });
    const nueva = await h.api('POST', '/api/auth/login', {
      body: { email: usuario.email, password: 'NuevaClave456' },
    });
    assert.equal(vieja.status, 401);
    assert.equal(nueva.status, 200);

    // El mismo enlace no se puede usar dos veces.
    const reuso = await h.api('POST', '/api/auth/reset-password', {
      body: { token, password: 'OtraClave789' },
    });
    assert.equal(reuso.status, 400);
  });

  test('el enlace vence en 30 minutos, sin importar la zona horaria del servidor', async () => {
    const usuario = await h.crearUsuario();
    await pedirToken(usuario.email);
    const [fila] = await h.query(
      `SELECT TIMESTAMPDIFF(SECOND, NOW(), expira_at) AS segundos
       FROM password_resets WHERE usuario_id = :id`,
      { id: usuario.id }
    );
    const minutos = Number(fila.segundos) / 60;
    assert.ok(minutos > 29 && minutos <= 30, `vence en ${minutos.toFixed(1)} minutos`);
  });

  test('un enlace vencido no funciona', async () => {
    const usuario = await h.crearUsuario();
    const { token } = await pedirToken(usuario.email);
    await h.query(
      'UPDATE password_resets SET expira_at = NOW() - INTERVAL 1 MINUTE WHERE usuario_id = :id',
      { id: usuario.id }
    );

    const res = await h.api('POST', '/api/auth/reset-password', {
      body: { token, password: 'NuevaClave456' },
    });
    assert.equal(res.status, 400);
  });

  test('un token inventado o mal formado es rechazado', async () => {
    const inventado = await h.api('POST', '/api/auth/reset-password', {
      body: { token: 'a'.repeat(64), password: 'NuevaClave456' },
    });
    const malFormado = await h.api('POST', '/api/auth/reset-password', {
      body: { token: 'no-es-un-token', password: 'NuevaClave456' },
    });
    assert.equal(inventado.status, 400);
    assert.equal(malFormado.status, 400);
  });

  test('exige una contrasena segura al restablecer', async () => {
    const usuario = await h.crearUsuario();
    const { token } = await pedirToken(usuario.email);
    const res = await h.api('POST', '/api/auth/reset-password', {
      body: { token, password: '123' },
    });
    assert.equal(res.status, 400);
  });
});
