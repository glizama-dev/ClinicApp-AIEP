'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (!config.mailer.gmailUser || !config.mailer.gmailAppPassword) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.mailer.gmailUser,
        pass: config.mailer.gmailAppPassword,
      },
    });
  }
  return transporter;
}

async function enviarCorreoRecuperacion(destinatario, link) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] GMAIL_USER/GMAIL_APP_PASSWORD no configurados; correo no enviado. Link:', link);
    return;
  }
  await t.sendMail({
    from: `ClinicApp <${config.mailer.gmailUser}>`,
    to: destinatario,
    subject: 'Recupera tu contraseña de ClinicApp',
    html: `
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta ClinicApp.</p>
      <p><a href="${link}">Haz clic aquí para crear una nueva contraseña</a></p>
      <p>Este enlace vence en 30 minutos. Si no solicitaste este cambio, ignora este correo.</p>
    `,
  });
}

module.exports = { enviarCorreoRecuperacion };
