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

module.exports = { normalizarRut };
