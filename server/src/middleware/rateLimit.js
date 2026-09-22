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

module.exports = { authLimiter };
