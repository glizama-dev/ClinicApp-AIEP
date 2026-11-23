'use strict';

const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

before(h.startServer);
after(h.stopServer);
beforeEach(async () => {
  h.mail.reset();
  await h.resetRateLimits();
});

const mensajeValido = {
  nombre: 'Ana Perez',
  email: 'ana.perez@gmail.com',
  mensaje: 'Hola, no puedo ingresar a mi cuenta. ¿Me pueden ayudar?',
};

describe('Formulario de contacto', () => {
  test('envia el mensaje a fichaclinica.aiep@gmail.com con respuesta al remitente', async () => {
    const res = await h.api('POST', '/api/contacto', { body: mensajeValido });

    assert.equal(res.status, 200);
    assert.equal(h.mail.sent.length, 1);
    const [correo] = h.mail.sent;
    assert.deepEqual(correo.to, [{ email: 'fichaclinica.aiep@gmail.com' }]);
    assert.deepEqual(correo.replyTo, { email: 'ana.perez@gmail.com', name: 'Ana Perez' });
    assert.match(correo.subject, /Ana Perez/);
    assert.match(correo.htmlContent, /no puedo ingresar a mi cuenta/);
  });

  test('el contenido con HTML o scripts llega escapado (no ejecutable)', async () => {
    await h.api('POST', '/api/contacto', {
      body: {
        nombre: 'Ana <b>Perez</b>',
        email: 'ana@ejemplo.cl',
        mensaje: 'Linea 1\n<script>alert("xss")</script><img src=x onerror=alert(1)>',
      },
    });
    const html = h.mail.sent[0].htmlContent;

    assert.ok(!html.includes('<script>'), 'no debe contener <script> sin escapar');
    assert.ok(!html.includes('<img'), 'no debe contener <img> sin escapar');
    assert.ok(!html.includes('<b>Perez'), 'el nombre debe ir escapado');
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /Linea 1<br>/, 'los saltos de linea se convierten en <br>');
  });

  test('valida nombre, correo y largo del mensaje', async () => {
    const casos = [
      { ...mensajeValido, nombre: 'A' },
      { ...mensajeValido, email: 'no-es-correo' },
      { ...mensajeValido, mensaje: 'corto' },
      { ...mensajeValido, mensaje: 'x'.repeat(3001) },
    ];
    for (const body of casos) {
      const res = await h.api('POST', '/api/contacto', { body });
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    }
    assert.equal(h.mail.sent.length, 0, 'no debe enviar correos con datos invalidos');
  });

  test('si Brevo falla, informa el error en vez de fingir que se envio', async () => {
    h.mail.status = 500;
    const res = await h.api('POST', '/api/contacto', { body: mensajeValido });
    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, 'CONTACTO_ERROR_ENVIO');
    assert.ok(!res.text.includes('error simulado'), 'no debe exponer el detalle interno de Brevo');
  });

  test('limita a 5 mensajes por hora por IP', async () => {
    for (let i = 0; i < 5; i += 1) {
      const ok = await h.api('POST', '/api/contacto', { body: mensajeValido });
      assert.equal(ok.status, 200);
    }
    const bloqueado = await h.api('POST', '/api/contacto', { body: mensajeValido });
    assert.equal(bloqueado.status, 429);
    assert.equal(h.mail.sent.length, 5);
  });
});
