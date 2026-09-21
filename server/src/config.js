'use strict';

const path = require('path');

// Un unico .env en la raiz del repo (lo comparten Node y docker-compose).
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function int(name, fallback) {
  const raw = optional(name, String(fallback));
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const config = {
  env: optional('NODE_ENV', 'development'),
  port: int('PORT', 3000),

  db: {
    host: optional('DB_HOST', 'db'),
    port: int('DB_PORT', 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES', '8h'),
  },

  smtp: {
    host: optional('SMTP_HOST', 'mailhog'),
    port: int('SMTP_PORT', 1025),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('MAIL_FROM', 'ClinicApp <no-reply@clinicapp.local>'),
  },

  auth: {
    allowedEmailDomain: optional('ALLOWED_EMAIL_DOMAIN', '@correoaiep.cl').toLowerCase(),
    codeTtlMinutes: int('CODE_TTL_MINUTES', 15),
    codeMaxAttempts: int('CODE_MAX_ATTEMPTS', 5),
  },

  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:3000'),

  // Carpeta del frontend estatico que sirve Express.
  staticDir: optional('STATIC_DIR', path.resolve(__dirname, '../..')),
};

module.exports = config;
