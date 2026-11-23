'use strict';

const ApiError = require('../lib/ApiError');
const config = require('../config');
const { mailerConfigurado, enviarMensajeContacto } = require('../lib/mailer');
const { contactSchema } = require('../validation/schemas');

const NO_DISPONIBLE = 'El formulario de contacto no esta disponible en este momento. Intenta mas tarde.';

async function enviar(req, res) {
  const data = contactSchema.parse(req.body);

  if (!mailerConfigurado() || !config.mailer.contactToEmail) {
    if (config.env === 'production') {
      console.error('[contacto] correo no configurado (BREVO_API_KEY / MAIL_FROM_EMAIL / CONTACT_TO_EMAIL)');
      throw new ApiError(503, 'CONTACTO_NO_DISPONIBLE', NO_DISPONIBLE);
    }
    // En desarrollo sin correo configurado, se muestra el mensaje en consola.
    console.warn('[contacto] correo no configurado; mensaje recibido:', data);
    return res.json({ message: 'Mensaje enviado. Te contactaremos pronto.' });
  }

  try {
    await enviarMensajeContacto(data);
  } catch (err) {
    console.error('[contacto] no se pudo enviar el mensaje:', err.message);
    throw new ApiError(502, 'CONTACTO_ERROR_ENVIO', 'No pudimos enviar tu mensaje. Intenta de nuevo en unos minutos.');
  }

  res.json({ message: 'Mensaje enviado. Te contactaremos pronto.' });
}

module.exports = { enviar };
