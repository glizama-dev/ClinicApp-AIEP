'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

before(async () => {
  await h.startServer();
  await h.resetDb();
});
after(h.stopServer);

function registro(overrides = {}) {
  return {
    nombre: 'Persona Prueba',
    rol: 'profesional',
    especialidad: 'podologia',
    email: `registro_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@gmail.com`,
    password: 'Prueba1234',
    aceptaTerminos: true,
    ...overrides,
  };
}

describe('Registro', () => {
  test('un profesional se registra con cualquier correo', async () => {
    const datos = registro();
    const res = await h.api('POST', '/api/auth/register', { body: datos });

    assert.equal(res.status, 201);
    assert.ok(res.body.token, 'debe devolver un token de sesion');
    assert.equal(res.body.usuario.email, datos.email);
    assert.equal(res.body.usuario.rol, 'profesional');
    assert.equal(res.body.usuario.password_hash, undefined, 'nunca debe exponer el hash');
  });

  test('guarda la fecha de aceptacion de los terminos', async () => {
    const datos = registro();
    await h.api('POST', '/api/auth/register', { body: datos });
    const [fila] = await h.query('SELECT terminos_aceptados_at FROM usuarios WHERE email = :email', {
      email: datos.email,
    });
    assert.ok(fila.terminos_aceptados_at, 'terminos_aceptados_at debe quedar registrado');
  });

  test('un estudiante se registra con correo institucional', async () => {
    const res = await h.api('POST', '/api/auth/register', {
      body: registro({ rol: 'estudiante', email: `alumno_${Date.now()}@correoaiep.cl` }),
    });
    assert.equal(res.status, 201);
  });

  test('un estudiante NO puede registrarse con correo no institucional', async () => {
    const res = await h.api('POST', '/api/auth/register', {
      body: registro({ rol: 'estudiante', email: `alumno_${Date.now()}@gmail.com` }),
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDACION');
  });

  test('rechaza el registro sin aceptar los terminos', async () => {
    const sinCampo = registro();
    delete sinCampo.aceptaTerminos;
    const r1 = await h.api('POST', '/api/auth/register', { body: sinCampo });
    const r2 = await h.api('POST', '/api/auth/register', { body: registro({ aceptaTerminos: false }) });

    assert.equal(r1.status, 400);
    assert.equal(r2.status, 400);
    assert.ok(r1.body.error.details.some((d) => d.campo === 'aceptaTerminos'));
  });

  test('rechaza contrasenas debiles', async () => {
    const res = await h.api('POST', '/api/auth/register', {
      body: registro({ password: 'solotexto' }),
    });
    assert.equal(res.status, 400);
  });

  test('no permite registrar dos veces el mismo correo', async () => {
    const usuario = await h.crearUsuario();
    const res = await h.api('POST', '/api/auth/register', { body: registro({ email: usuario.email }) });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'EMAIL_YA_REGISTRADO');
  });

  test('no permite registrarse como admin', async () => {
    const res = await h.api('POST', '/api/auth/register', { body: registro({ rol: 'admin' }) });
    assert.equal(res.status, 400);
  });
});

describe('Inicio de sesion', () => {
  test('con credenciales correctas devuelve token y datos del usuario', async () => {
    const usuario = await h.crearUsuario();
    const res = await h.api('POST', '/api/auth/login', {
      body: { email: usuario.email, password: usuario.password },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.usuario.email, usuario.email);
    assert.equal(res.body.usuario.password_hash, undefined);
  });

  test('el correo no distingue mayusculas', async () => {
    const usuario = await h.crearUsuario();
    const res = await h.api('POST', '/api/auth/login', {
      body: { email: usuario.email.toUpperCase(), password: usuario.password },
    });
    assert.equal(res.status, 200);
  });

  test('contrasena incorrecta y correo inexistente dan el mismo error', async () => {
    const usuario = await h.crearUsuario();
    const malaClave = await h.api('POST', '/api/auth/login', {
      body: { email: usuario.email, password: 'Incorrecta123' },
    });
    const noExiste = await h.api('POST', '/api/auth/login', {
      body: { email: 'nadie@ejemplo.cl', password: 'Incorrecta123' },
    });

    assert.equal(malaClave.status, 401);
    assert.equal(noExiste.status, 401);
    // Mismo mensaje: no se revela si el correo esta registrado.
    assert.equal(malaClave.body.error.message, noExiste.body.error.message);
  });

  test('una cuenta suspendida no puede iniciar sesion', async () => {
    const usuario = await h.crearUsuario({ estado: 'suspendido' });
    const res = await h.api('POST', '/api/auth/login', {
      body: { email: usuario.email, password: usuario.password },
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'CUENTA_SUSPENDIDA');
  });
});

describe('Sesion (/api/auth/me)', () => {
  test('sin token responde 401', async () => {
    const res = await h.api('GET', '/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('con token valido devuelve el usuario', async () => {
    const usuario = await h.crearUsuarioConSesion();
    const res = await h.api('GET', '/api/auth/me', { token: usuario.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.email, usuario.email);
  });

  test('un token alterado es rechazado', async () => {
    const usuario = await h.crearUsuarioConSesion();
    const [cabecera, payload, firma] = usuario.token.split('.');
    const datos = JSON.parse(Buffer.from(payload, 'base64url').toString());
    datos.rol = 'admin';
    const falso = [cabecera, Buffer.from(JSON.stringify(datos)).toString('base64url'), firma].join('.');

    const res = await h.api('GET', '/api/auth/me', { token: falso });
    assert.equal(res.status, 401);
  });

  test('un token sin firma (alg "none") es rechazado', async () => {
    const usuario = await h.crearUsuarioConSesion();
    const payload = usuario.token.split('.')[1];
    const cabecera = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');

    const res = await h.api('GET', '/api/auth/me', { token: `${cabecera}.${payload}.` });
    assert.equal(res.status, 401);
  });

  test('si la cuenta se suspende, su sesion abierta deja de funcionar', async () => {
    const usuario = await h.crearUsuarioConSesion();
    await h.query("UPDATE usuarios SET estado = 'suspendido' WHERE id = :id", { id: usuario.id });

    const res = await h.api('GET', '/api/auth/me', { token: usuario.token });
    assert.equal(res.status, 403);
  });
});
