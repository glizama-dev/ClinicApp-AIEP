'use strict';

/**
 * Error de aplicacion con codigo HTTP y codigo simbolico para el frontend.
 */
class ApiError extends Error {
  /**
   * @param {number} status  codigo HTTP
   * @param {string} code    codigo simbolico (ej. 'CUENTA_SUSPENDIDA')
   * @param {string} message mensaje legible
   * @param {any} [details]
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'No autenticado') {
    return new ApiError(401, 'NO_AUTENTICADO', message);
  }

  static forbidden(message = 'Sin permisos', code = 'SIN_PERMISOS') {
    return new ApiError(403, code, message);
  }

  static notFound(message = 'No encontrado') {
    return new ApiError(404, 'NO_ENCONTRADO', message);
  }

  static conflict(message, code = 'CONFLICTO') {
    return new ApiError(409, code, message);
  }

  static tooMany(message = 'Demasiadas solicitudes') {
    return new ApiError(429, 'DEMASIADAS_SOLICITUDES', message);
  }
}

module.exports = ApiError;
