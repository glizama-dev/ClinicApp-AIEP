'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

const JWT_ALGORITHM = 'HS256';

/**
 * Firma un JWT de acceso para un usuario. Incluye la version de sesion (tv):
 * si el usuario cambia su contrasena, los tokens con una version anterior
 * dejan de ser validos.
 * @param {{id:number, nombre:string, rol:string, especialidad:string, token_version?:number}} usuario
 */
function signAccessToken(usuario) {
  return jwt.sign(
    {
      nombre: usuario.nombre,
      rol: usuario.rol,
      especialidad: usuario.especialidad,
      tv: Number(usuario.token_version || 0),
    },
    config.jwt.secret,
    { subject: String(usuario.id), expiresIn: config.jwt.expiresIn, algorithm: JWT_ALGORITHM }
  );
}

/** Verifica firma y expiracion aceptando solo el algoritmo esperado. */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret, { algorithms: [JWT_ALGORITHM] });
}

module.exports = { signAccessToken, verifyAccessToken };
