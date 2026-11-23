'use strict';

/**
 * Variables de entorno de las pruebas. Debe cargarse ANTES que cualquier
 * modulo de src/ (dotenv no sobrescribe variables ya definidas, asi que estos
 * valores ganan sobre los del .env).
 */

const TEST_DB_NAME = 'clinicapp_test';
const TEST_DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';

process.env.NODE_ENV = 'test';
process.env.DB_HOST = TEST_DB_HOST;
process.env.DB_NAME = TEST_DB_NAME;

// Correo: clave FALSA. Ademas, helpers.js intercepta toda llamada a Brevo,
// asi que las pruebas nunca envian correos reales.
process.env.BREVO_API_KEY = 'clave-falsa-de-pruebas';
process.env.MAIL_FROM_EMAIL = 'no-reply@clinicapp.test';
process.env.MAIL_FROM_NAME = 'ClinicApp Pruebas';
process.env.CONTACT_TO_EMAIL = 'fichaclinica.aiep@gmail.com';
process.env.APP_BASE_URL = 'http://clinicapp.test';
process.env.ALLOWED_EMAIL_DOMAIN = '@correoaiep.cl';

module.exports = { TEST_DB_NAME, TEST_DB_HOST };
