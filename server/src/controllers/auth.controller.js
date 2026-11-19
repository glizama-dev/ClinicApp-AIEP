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
// Debe usar el MISMO costo que los hashes reales; si no, la diferencia de
// tiempo revela que correos estan registrados.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-no-usado', BCRYPT_COST);

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

async function generarYEnviarReset(usuario) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiraAt = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000);

  await passwordResetsRepo.crear({ usuarioId: usuario.id, tokenHash, expiraAt });

  // El token va en el fragmento (#): el navegador no lo envia al servidor,
  // asi no queda registrado en logs de acceso ni de proxies.
  const link = `${config.appBaseUrl}/reset-password.html#token=${token}`;
  await enviarCorreoRecuperacion(usuario.email, link);
}

async function forgotPassword(req, res) {
  const { email } = forgotPasswordSchema.parse(req.body);
  const usuario = await usuariosRepo.buscarPorEmail(email);

  // Se responde sin esperar el envio del correo: si se esperara, el tiempo de
  // respuesta revelaria si el correo esta registrado.
  if (usuario) {
    generarYEnviarReset(usuario).catch((err) => {
      console.error('[forgot-password] no se pudo enviar el correo de recuperacion:', err.message);
    });
  }

  res.json({ message: MENSAJE_GENERICO_FORGOT });
}

async function resetPassword(req, res) {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const enlaceInvalido = () =>
    ApiError.badRequest('Este enlace no es valido o ya vencio. Solicita uno nuevo.');

  const reset = await passwordResetsRepo.buscarVigentePorHash(tokenHash);
  if (!reset) throw enlaceInvalido();

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const ok = await usuariosRepo.resetearPassword({
    resetId: reset.id,
    usuarioId: reset.usuario_id,
    passwordHash,
  });
  if (!ok) throw enlaceInvalido();

  res.json({ message: 'Contrasena actualizada correctamente. Inicia sesion con tu nueva contrasena.' });
}

module.exports = { register, login, me, forgotPassword, resetPassword };
