'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

let podologa; // profesional de podologia
let otraPodologa; // otra profesional de podologia
let cosmetologa; // profesional de cosmetologia

before(async () => {
  await h.startServer();
  await h.resetDb();
  podologa = await h.crearUsuarioConSesion({ especialidad: 'podologia' });
  otraPodologa = await h.crearUsuarioConSesion({ especialidad: 'podologia' });
  cosmetologa = await h.crearUsuarioConSesion({ especialidad: 'cosmetologia' });
});
after(h.stopServer);

async function crearFicha(usuario, overrides) {
  const res = await h.api('POST', '/api/fichas', { token: usuario.token, body: h.fichaEjemplo(overrides) });
  assert.equal(res.status, 201, res.text);
  return res.body.id;
}

describe('Fichas: acceso', () => {
  test('sin sesion no se puede listar, ver ni crear fichas', async () => {
    const listar = await h.api('GET', '/api/fichas');
    const ver = await h.api('GET', '/api/fichas/1');
    const crear = await h.api('POST', '/api/fichas', { body: h.fichaEjemplo() });
    assert.equal(listar.status, 401);
    assert.equal(ver.status, 401);
    assert.equal(crear.status, 401);
  });
});

describe('Fichas: crear y consultar', () => {
  test('crea una ficha y la devuelve completa al consultarla', async () => {
    const id = await crearFicha(podologa);
    const res = await h.api('GET', `/api/fichas/${id}`, { token: podologa.token });

    assert.equal(res.status, 200);
    assert.equal(res.body.especialidad, 'podologia');
    assert.equal(res.body.paciente_rut, '11111111-1');
    assert.equal(res.body.datos.motivoConsulta, 'Control');
    assert.equal(res.body.firmas.paciente, h.PNG_DATA_URL);
    assert.equal(res.body.fotos.length, 1);
  });

  test('acepta RUT con digito verificador K en minuscula y lo guarda en mayuscula', async () => {
    const ficha = h.fichaEjemplo();
    ficha.paciente.rut = '10000013-k';
    const id = await crearFicha(podologa, { paciente: ficha.paciente });
    const res = await h.api('GET', `/api/fichas/${id}`, { token: podologa.token });
    assert.equal(res.body.paciente_rut, '10000013-K');
  });

  test('rechaza un RUT con puntos (formato exigido: 12345678-9)', async () => {
    const ficha = h.fichaEjemplo();
    ficha.paciente.rut = '11.111.111-1';
    const res = await h.api('POST', '/api/fichas', { token: podologa.token, body: ficha });
    assert.equal(res.status, 400);
  });

  test('rechaza un RUT con digito verificador incorrecto', async () => {
    const ficha = h.fichaEjemplo();
    ficha.paciente.rut = '12345678-9';
    const res = await h.api('POST', '/api/fichas', { token: podologa.token, body: ficha });
    assert.equal(res.status, 400);
  });

  test('rechaza una fecha de atencion invalida', async () => {
    const res = await h.api('POST', '/api/fichas', {
      token: podologa.token,
      body: h.fichaEjemplo({ fechaAtencion: '2026-02-30' }),
    });
    assert.equal(res.status, 400);
  });

  test('una profesional de cosmetologia no puede crear fichas de podologia', async () => {
    const res = await h.api('POST', '/api/fichas', {
      token: cosmetologa.token,
      body: h.fichaEjemplo({ especialidad: 'podologia' }),
    });
    assert.equal(res.status, 403);
  });

  test('rechaza mas de 6 fotos por ficha', async () => {
    const fotos = Array.from({ length: 7 }, () => ({ dataUrl: h.PNG_DATA_URL }));
    const res = await h.api('POST', '/api/fichas', { token: podologa.token, body: h.fichaEjemplo({ fotos }) });
    assert.equal(res.status, 400);
  });
});

describe('Fichas: privacidad entre usuarios', () => {
  test('cada usuario solo ve sus propias fichas en el listado', async () => {
    await crearFicha(otraPodologa);
    const propias = await h.api('GET', '/api/fichas?pageSize=100', { token: podologa.token });
    const ajenas = await h.api('GET', '/api/fichas?pageSize=100', { token: otraPodologa.token });

    assert.equal(propias.status, 200);
    assert.ok(propias.body.items.length > 0);
    assert.ok(propias.body.items.every((f) => Number(f.profesional_id) === podologa.id));
    assert.ok(ajenas.body.items.every((f) => Number(f.profesional_id) === otraPodologa.id));
  });

  test('no se puede ver la ficha de otro usuario', async () => {
    const id = await crearFicha(podologa);
    const res = await h.api('GET', `/api/fichas/${id}`, { token: otraPodologa.token });
    assert.equal(res.status, 403);
  });

  test('no se puede editar la ficha de otro usuario', async () => {
    const id = await crearFicha(podologa);
    const res = await h.api('PUT', `/api/fichas/${id}`, {
      token: otraPodologa.token,
      body: { datos: { observaciones: 'alterado' } },
    });
    assert.equal(res.status, 403);

    const original = await h.api('GET', `/api/fichas/${id}`, { token: podologa.token });
    assert.equal(original.body.datos.observaciones, 'Sin novedades');
  });

  test('pedir otra especialidad en el filtro no muestra fichas ajenas', async () => {
    const res = await h.api('GET', '/api/fichas?especialidad=podologia', { token: cosmetologa.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 0);
  });

  test('una ficha nueva no sobrescribe los datos de un paciente ya registrado', async () => {
    const ficha = h.fichaEjemplo();
    ficha.paciente = { ...ficha.paciente, rut: '22222222-2', telefono: '+56922222222' };
    await crearFicha(podologa, { paciente: ficha.paciente });

    const intento = { ...ficha.paciente, nombre: 'Nombre Alterado', telefono: '+56900000000' };
    await crearFicha(otraPodologa, { paciente: intento });

    const [paciente] = await h.query('SELECT nombre, telefono FROM pacientes WHERE rut = :rut', {
      rut: '22222222-2',
    });
    assert.equal(paciente.nombre, 'Paciente Prueba');
    assert.equal(paciente.telefono, '+56922222222');
  });

  test('una ficha inexistente responde 404', async () => {
    const res = await h.api('GET', '/api/fichas/999999', { token: podologa.token });
    assert.equal(res.status, 404);
  });
});

describe('Fichas: editar', () => {
  test('el autor puede actualizar datos y estado', async () => {
    const id = await crearFicha(podologa, { estado: 'borrador' });
    const res = await h.api('PUT', `/api/fichas/${id}`, {
      token: podologa.token,
      body: { datos: { observaciones: 'Actualizado' }, estado: 'finalizada' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.datos.observaciones, 'Actualizado');
    assert.equal(res.body.estado, 'finalizada');
  });

  test('una actualizacion vacia es rechazada', async () => {
    const id = await crearFicha(podologa);
    const res = await h.api('PUT', `/api/fichas/${id}`, { token: podologa.token, body: {} });
    assert.equal(res.status, 400);
  });
});

describe('Fichas: imagenes maliciosas (XSS)', () => {
  const maliciosas = {
    'SVG con script': 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+',
    'HTML disfrazado': 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'esquema javascript': 'javascript:alert(1)',
    'atributo inyectado': 'data:image/png;base64,AAAA" onerror="alert(1)',
  };

  for (const [nombre, dataUrl] of Object.entries(maliciosas)) {
    test(`rechaza firma: ${nombre}`, async () => {
      const res = await h.api('POST', '/api/fichas', {
        token: podologa.token,
        body: h.fichaEjemplo({ firmas: { paciente: dataUrl } }),
      });
      assert.equal(res.status, 400);
    });

    test(`rechaza foto: ${nombre}`, async () => {
      const res = await h.api('POST', '/api/fichas', {
        token: podologa.token,
        body: h.fichaEjemplo({ fotos: [{ dataUrl }] }),
      });
      assert.equal(res.status, 400);
    });
  }
});
