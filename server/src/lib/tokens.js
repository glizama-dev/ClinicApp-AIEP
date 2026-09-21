'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Firma un JWT de acceso para un usuario.
 * @param {{id:number, nombre:string, rol:string, especialidad:string}} usuario
 */
function signAccessToken(usuario) {
  return jwt.sign(
    { nombre: usuario.nombre, rol: usuario.rol, especialidad: usuario.especialidad },
    config.jwt.secret,
    { subject: String(usuario.id), expiresIn: config.jwt.expiresIn }
  );
}

/** Genera un codigo numerico de 6 digitos (como string, con ceros a la izquierda). */
function generarCodigo() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Hash estable (no reversible) para guardar el codigo de verificacion. */
function hashCodigo(codigo) {
  return crypto.createHash('sha256').update(String(codigo)).digest('hex');
}

module.exports = { signAccessToken, generarCodigo, hashCodigo };
