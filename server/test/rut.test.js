'use strict';

// Pruebas unitarias: no necesitan base de datos ni servidor.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { esRutValido, normalizarRut } = require('../src/lib/rut');

describe('esRutValido', () => {
  test('acepta RUT con digito verificador correcto', () => {
    for (const rut of ['11111111-1', '22222222-2', '5126663-3', '10000013-K', '10000013-k']) {
      assert.equal(esRutValido(rut), true, rut);
    }
  });

  test('rechaza RUT con digito verificador incorrecto', () => {
    for (const rut of ['12345678-9', '11111111-2', '10000013-1']) {
      assert.equal(esRutValido(rut), false, rut);
    }
  });

  test('rechaza formatos invalidos', () => {
    for (const rut of ['', '11.111.111-1', '111111111', '11111111-', 'abc-1', '123456789-1', null, undefined]) {
      assert.equal(esRutValido(rut), false, String(rut));
    }
  });
});

describe('normalizarRut', () => {
  test('quita puntos y espacios, y pone la K en mayuscula', () => {
    assert.equal(normalizarRut('11.111.111-1'), '11111111-1');
    assert.equal(normalizarRut(' 10000013-k '), '10000013-K');
    assert.equal(normalizarRut('111111111'), '11111111-1');
  });

  test('tolera valores vacios', () => {
    assert.equal(normalizarRut(''), '');
    assert.equal(normalizarRut(null), '');
  });
});
