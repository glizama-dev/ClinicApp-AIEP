'use strict';

/**
 * Envuelve un handler async para que sus rechazos lleguen al middleware de errores.
 * @param {Function} fn
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
