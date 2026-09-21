'use strict';

const { ZodError } = require('zod');
const ApiError = require('../lib/ApiError');

// eslint-disable-next-line no-unused-vars
function notFound(req, res, next) {
  res.status(404).json({ error: { code: 'NO_ENCONTRADO', message: 'Ruta no encontrada' } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDACION',
        message: 'Datos invalidos',
        details: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
      },
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: { code: 'CONFLICTO', message: 'El registro ya existe' } });
  }

  console.error('[error]', err);
  return res.status(500).json({ error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' } });
}

module.exports = { notFound, errorHandler };
