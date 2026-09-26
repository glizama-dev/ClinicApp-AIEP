'use strict';

const config = require('../config');

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

async function enviarCorreoRecuperacion(destinatario, link) {
  if (!config.mailer.brevoApiKey || !config.mailer.fromEmail) {
    console.warn('[mailer] BREVO_API_KEY/MAIL_FROM_EMAIL no configurados; correo no enviado. Link:', link);
    return;
  }

  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': config.mailer.brevoApiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: config.mailer.fromName, email: config.mailer.fromEmail },
      to: [{ email: destinatario }],
      subject: 'Recupera tu contraseña de ClinicApp',
      htmlContent: `
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta ClinicApp.</p>
        <p><a href="${link}">Haz clic aquí para crear una nueva contraseña</a></p>
        <p>Este enlace vence en 30 minutos. Si no solicitaste este cambio, ignora este correo.</p>
      `,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(`[mailer] Brevo respondio ${res.status}: ${detalle}`);
  }
}

module.exports = { enviarCorreoRecuperacion };
