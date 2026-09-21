'use strict';

const rateLimit = require('express-rate-limit');

const jsonMessage = (message) => ({ error: { code: 'DEMASIADAS_SOLICITUDES', message } });

// Login / register: moderado.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Demasiados intentos. Espera unos minutos e intenta de nuevo.'),
});

// Reenvio de codigo: estricto.
const resendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Ya solicitaste varios codigos. Espera antes de pedir otro.'),
});

module.exports = { authLimiter, resendLimiter };
