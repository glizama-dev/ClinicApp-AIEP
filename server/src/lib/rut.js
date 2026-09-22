'use strict';

/**
 * Normaliza un RUT chileno a formato "12345678-9" (sin puntos, guion antes del
 * digito verificador, K en mayuscula). No valida el digito verificador: la
 * ficha puede registrarse aunque el RUT venga incompleto.
 * @param {string} raw
 * @returns {string}
 */
function normalizarRut(raw) {
  const limpio = String(raw || '')
    .trim()
    .replace(/[.\s]/g, '')
    .replace(/-/g, '')
    .toUpperCase();

  if (limpio.length < 2) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${cuerpo}-${dv}`;
}

const RUT_REGEX = /^(\d{1,8})-([0-9K])$/;

function calcularDigitoVerificador(cuerpo) {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

/**
 * Valida formato estricto "12345678-9" (sin puntos, guion obligatorio) y que
 * el digito verificador sea matematicamente correcto.
 * @param {string} rut
 * @returns {boolean}
 */
function esRutValido(rut) {
  const match = RUT_REGEX.exec(String(rut || '').trim().toUpperCase());
  if (!match) return false;
  return match[2] === calcularDigitoVerificador(match[1]);
}

module.exports = { normalizarRut, esRutValido };
