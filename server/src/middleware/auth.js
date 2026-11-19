'use strict';

const ApiError = require('../lib/ApiError');
const { verifyAccessToken } = require('../lib/tokens');
const usuariosRepo = require('../repositories/usuarios.repo');

/**
 * Exige un JWT valido en el header Authorization: Bearer <token>.
 * Ademas de la firma, revalida contra la BD en cada request: el usuario debe
 * existir, estar activo y la version de sesion debe coincidir (un cambio de
 * contrasena invalida los tokens anteriores). Rol y especialidad se toman de
 * la BD, no del token, para que los cambios de permisos apliquen de inmediato.
 * Deja en req.user = { id, nombre, rol, especialidad }.
 */
async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Falta el token de acceso'));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    return next(ApiError.unauthorized('Token invalido o expirado'));
  }

  try {
    const usuario = await usuariosRepo.buscarSesion(Number(payload.sub));
    if (!usuario || Number(usuario.token_version) !== Number(payload.tv || 0)) {
      return next(ApiError.unauthorized('Tu sesion ya no es valida. Inicia sesion nuevamente.'));
    }
    if (usuario.estado !== 'activo') {
      return next(ApiError.forbidden('Tu cuenta esta suspendida. Contacta al administrador.', 'CUENTA_SUSPENDIDA'));
    }

    req.user = {
      id: Number(usuario.id),
      nombre: usuario.nombre,
      rol: usuario.rol,
      especialidad: usuario.especialidad,
    };
    return next();
  } catch (err) {
    return next(err);
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
