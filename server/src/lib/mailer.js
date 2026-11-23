'use strict';

const config = require('../config');

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function mailerConfigurado() {
  return Boolean(config.mailer.brevoApiKey && config.mailer.fromEmail);
}

// Escapa texto ingresado por usuarios antes de insertarlo en el HTML del correo.
function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function enviarCorreo({ to, subject, htmlContent, replyTo }) {
  const body = {
    sender: { name: config.mailer.fromName, email: config.mailer.fromEmail },
    to: [{ email: to }],
    subject,
    htmlContent,
  };
  if (replyTo) body.replyTo = replyTo;

  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': config.mailer.brevoApiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(`[mailer] Brevo respondio ${res.status}: ${detalle}`);
  }
}

async function enviarCorreoRecuperacion(destinatario, link) {
  if (!mailerConfigurado()) {
    console.warn('[mailer] BREVO_API_KEY/MAIL_FROM_EMAIL no configurados; correo no enviado. Link:', link);
    return;
  }

  await enviarCorreo({
    to: destinatario,
    subject: 'Recupera tu contraseña de ClinicApp',
    htmlContent: `
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta ClinicApp.</p>
      <p><a href="${link}">Haz clic aquí para crear una nueva contraseña</a></p>
      <p>Este enlace vence en 30 minutos. Si no solicitaste este cambio, ignora este correo.</p>
    `,
  });
}

// Reenvia un mensaje del formulario de contacto de la landing al buzon del equipo.
// Responder el correo le contesta directamente a quien escribio (replyTo).
async function enviarMensajeContacto({ nombre, email, mensaje }) {
  const destino = config.mailer.contactToEmail;
  const nombreSeguro = escaparHtml(nombre);
  const emailSeguro = escaparHtml(email);
  const mensajeSeguro = escaparHtml(mensaje).replace(/\r?\n/g, '<br>');

  await enviarCorreo({
    to: destino,
    replyTo: { email, name: nombre },
    subject: `Contacto ClinicApp: ${nombre}`,
    htmlContent: `
      <p><strong>Nuevo mensaje desde el formulario de contacto de ClinicApp</strong></p>
      <p><strong>Nombre:</strong> ${nombreSeguro}<br>
      <strong>Correo:</strong> ${emailSeguro}</p>
      <p><strong>Mensaje:</strong><br>${mensajeSeguro}</p>
      <p style="color:#888;font-size:12px">Responde este correo para contestarle directamente.</p>
    `,
  });
}

module.exports = { mailerConfigurado, enviarCorreoRecuperacion, enviarMensajeContacto };
