'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ApiError = require('../lib/ApiError');
const { signAccessToken } = require('../lib/tokens');
const { enviarCorreoRecuperacion } = require('../lib/mailer');
const config = require('../config');
const usuariosRepo = require('../repositories/usuarios.repo');
const passwordResetsRepo = require('../repositories/passwordResets.repo');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validation/schemas');

const BCRYPT_COST = 12;
const RESET_TOKEN_TTL_MIN = 30;

// Hash valido de descarte: iguala el tiempo de respuesta cuando el correo no existe.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-no-usado', 10);

function sinHash(usuario) {
  if (!usuario) return usuario;
  const { password_hash, ...rest } = usuario;
  return rest;
}

async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const existente = await usuariosRepo.buscarPorEmail(data.email);

  if (existente) {
    throw ApiError.conflict('Este correo ya tiene una cuenta. Inicia sesion.', 'EMAIL_YA_REGISTRADO');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);
  const usuario = await usuariosRepo.crear({
    nombre: data.nombre,
    email: data.email,
    passwordHash,
    rol: data.rol,
    especialidad: data.especialidad,
  });

  const token = signAccessToken(usuario);
  res.status(201).json({ token, usuario: sinHash(usuario) });
}

async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);
  const usuario = await usuariosRepo.buscarPorEmailConHash(email);

  const hash = usuario ? usuario.password_hash : DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);

  if (!usuario || !ok) {
    throw ApiError.unauthorized('Correo o contrasena incorrectos');
  }
  if (usuario.estado === 'suspendido') {
    throw ApiError.forbidden('Tu cuenta esta suspendida. Contacta al administrador.', 'CUENTA_SUSPENDIDA');
  }

  const token = signAccessToken(usuario);
  res.json({ token, usuario: sinHash(usuario) });
}

async function me(req, res) {
  const usuario = await usuariosRepo.buscarPorId(req.user.id);
  if (!usuario) throw ApiError.unauthorized('Usuario no encontrado');
  res.json({ usuario });
}

const MENSAJE_GENERICO_FORGOT =
  'Si el correo esta registrado, te enviamos instrucciones para recuperar tu contrasena.';

async function forgotPassword(req, res) {
  const { email } = forgotPasswordSchema.parse(req.body);
  const usuario = await usuariosRepo.buscarPorEmail(email);

  if (usuario) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiraAt = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000);

    await passwordResetsRepo.crear({ usuarioId: usuario.id, tokenHash, expiraAt });

    const link = `${config.appBaseUrl}/reset-password.html?token=${token}`;
    await enviarCorreoRecuperacion(usuario.email, link);
  }

  res.json({ message: MENSAJE_GENERICO_FORGOT });
}

async function resetPassword(req, res) {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const reset = await passwordResetsRepo.buscarVigentePorHash(tokenHash);
  if (!reset) {
    throw ApiError.badRequest('Este enlace no es valido o ya vencio. Solicita uno nuevo.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await usuariosRepo.actualizarPassword(reset.usuario_id, passwordHash);
  await passwordResetsRepo.marcarConsumido(reset.id);

  res.json({ message: 'Contrasena actualizada correctamente.' });
}

module.exports = { register, login, me, forgotPassword, resetPassword };
