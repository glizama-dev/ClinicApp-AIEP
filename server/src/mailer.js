'use strict';

const nodemailer = require('nodemailer');
const config = require('./config');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
});

/**
 * Envia el correo con el codigo de verificacion de registro.
 * @param {{ para:string, nombre:string, codigo:string, ttlMinutos:number }} p
 */
async function enviarCodigoVerificacion({ para, nombre, codigo, ttlMinutos }) {
  const asunto = 'Confirma tu registro en ClinicApp';
  const texto =
    `Hola ${nombre},\n\n` +
    `Tu codigo de verificacion para ClinicApp es: ${codigo}\n` +
    `Vence en ${ttlMinutos} minutos.\n\n` +
    `Si no creaste esta cuenta, ignora este mensaje.`;
  const html =
    `<p>Hola ${nombre},</p>` +
    `<p>Tu codigo de verificacion para <strong>ClinicApp</strong> es:</p>` +
    `<p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:16px 0">${codigo}</p>` +
    `<p>Vence en ${ttlMinutos} minutos.</p>` +
    `<p style="color:#667">Si no creaste esta cuenta, ignora este mensaje.</p>`;

  const info = await transporter.sendMail({
    from: config.smtp.from,
    to: para,
    subject: asunto,
    text: texto,
    html,
  });

  if (config.env !== 'production') {
    console.log(`[mailer] codigo enviado a ${para} (messageId ${info.messageId})`);
  }
  return info;
}

module.exports = { transporter, enviarCodigoVerificacion };
