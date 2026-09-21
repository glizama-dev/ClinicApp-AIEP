'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../lib/ApiError');

/**
 * Exige un JWT valido en el header Authorization: Bearer <token>.
 * Deja el payload en req.user = { id, nombre, rol, especialidad }.
 */
function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Falta el token de acceso'));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: Number(payload.sub),
      nombre: payload.nombre,
      rol: payload.rol,
      especialidad: payload.especialidad,
    };
    return next();
  } catch (err) {
    return next(ApiError.unauthorized('Token invalido o expirado'));
  }
}

/**
 * Restringe la ruta a determinados roles. Usar despues de requireAuth.
 * @param {...string} roles
 */
function requireRole(...roles) {
  return function check(req, res, next) {
    if (!req.user || !roles.includes(req.user.rol)) {
      return next(ApiError.forbidden('No tienes permisos para esta accion'));
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
