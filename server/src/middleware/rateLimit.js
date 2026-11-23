'use strict';

const rateLimit = require('express-rate-limit');

const QUINCE_MIN = 15 * 60 * 1000;
const jsonMessage = (message) => ({ error: { code: 'DEMASIADAS_SOLICITUDES', message } });
const MSG_AUTH = 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';

function limiter({ windowMs = QUINCE_MIN, max, message = MSG_AUTH, ...rest }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonMessage(message),
    ...rest,
  });
}

// Cada ruta de autenticacion tiene su propio contador por IP, para que, por
// ejemplo, registrarse no consuma los intentos de login.
const loginLimiter = limiter({ max: 20 });
const registerLimiter = limiter({ max: 10 });
const forgotPasswordLimiter = limiter({ max: 5 });
const resetPasswordLimiter = limiter({ max: 10 });

// Formulario de contacto publico: evita que se use para inundar el buzon.
const contactLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Enviaste varios mensajes seguidos. Intenta de nuevo en una hora.',
});

// Fuerza bruta distribuida (muchas IPs contra una cuenta): limita los intentos
// FALLIDOS por correo. Los logins exitosos no cuentan.
const loginPorCuentaLimiter = limiter({
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = req.body && typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `login:${email}`;
  },
  message: 'Demasiados intentos fallidos para esta cuenta. Espera 15 minutos o recupera tu contrasena.',
});

// Limite general de la API (lectura/escritura de fichas, etc.).
const apiLimiter = limiter({
  max: 600,
  message: 'Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.',
});

module.exports = {
  loginLimiter,
  loginPorCuentaLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  contactLimiter,
  apiLimiter,
};
