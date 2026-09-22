'use strict';

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

module.exports = { signAccessToken };
