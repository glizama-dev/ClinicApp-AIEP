'use strict';

const bcrypt = require('bcryptjs');

const config = require('../config');
const ApiError = require('../lib/ApiError');
const { signAccessToken, generarCodigo, hashCodigo } = require('../lib/tokens');
const usuariosRepo = require('../repositories/usuarios.repo');
const codigosRepo = require('../repositories/codigos.repo');
const mailer = require('../mailer');
const {
  registerSchema,
  verifySchema,
  resendSchema,
  loginSchema,
} = require('../validation/schemas');

const BCRYPT_COST = 12;

// Hash valido de descarte: iguala el tiempo de respuesta cuando el correo no existe.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-no-usado', 10);

function sinHash(usuario) {
  if (!usuario) return usuario;
  const { password_hash, ...rest } = usuario;
  return rest;
}

/** Genera un codigo nuevo para el usuario y lo envia por correo. */
async function emitirCodigo(usuario) {
  const codigo = generarCodigo();
  await codigosRepo.crear({
    usuarioId: usuario.id,
    codigoHash: hashCodigo(codigo),
    ttlMinutos: config.auth.codeTtlMinutes,
  });
  await mailer.enviarCodigoVerificacion({
    para: usuario.email,
    nombre: usuario.nombre,
    codigo,
    ttlMinutos: config.auth.codeTtlMinutes,
  });
}

async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const existente = await usuariosRepo.buscarPorEmail(data.email);

  if (existente && existente.estado === 'activo') {
    throw ApiError.conflict('Este correo ya tiene una cuenta activa. Inicia sesion.', 'EMAIL_YA_REGISTRADO');
  }

  let usuario = existente;
  if (!usuario) {
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);
    usuario = await usuariosRepo.crear({
      nombre: data.nombre,
      email: data.email,
      passwordHash,
      rol: data.rol,
      especialidad: data.especialidad,
    });
  }

  await emitirCodigo(usuario);

  res.status(201).json({
    message: 'Te enviamos un codigo de verificacion a tu correo institucional.',
    email: usuario.email,
    expiraEnMinutos: config.auth.codeTtlMinutes,
  });
}

async function verify(req, res) {
  const { email, codigo } = verifySchema.parse(req.body);
  const usuario = await usuariosRepo.buscarPorEmail(email);

  if (!usuario) {
    throw ApiError.badRequest('No encontramos un registro pendiente para ese correo.');
  }
  if (usuario.estado === 'activo') {
    throw ApiError.conflict('Esta cuenta ya esta verificada. Inicia sesion.', 'EMAIL_YA_REGISTRADO');
  }

  const registro = await codigosRepo.obtenerVigente(usuario.id);
  if (!registro) {
    throw ApiError.badRequest('No hay un codigo activo. Solicita uno nuevo.', { code: 'CODIGO_INEXISTENTE' });
  }
  if (registro.intentos >= config.auth.codeMaxAttempts) {
    await codigosRepo.consumir(registro.id);
    throw ApiError.badRequest('Codigo bloqueado por demasiados intentos. Solicita uno nuevo.');
  }
  if (registro.expirado) {
    await codigosRepo.consumir(registro.id);
    throw ApiError.badRequest('El codigo expiro. Solicita uno nuevo.');
  }

  if (registro.codigo_hash !== hashCodigo(codigo)) {
    await codigosRepo.incrementarIntentos(registro.id);
    const restantes = Math.max(0, config.auth.codeMaxAttempts - (registro.intentos + 1));
    throw ApiError.badRequest(`Codigo incorrecto. Te quedan ${restantes} intento(s).`);
  }

  await codigosRepo.consumir(registro.id);
  const activo = await usuariosRepo.marcarVerificado(usuario.id);
  const token = signAccessToken(activo);

  res.json({ token, usuario: sinHash(activo) });
}

async function resend(req, res) {
  const { email } = resendSchema.parse(req.body);
  const usuario = await usuariosRepo.buscarPorEmail(email);

  // Respuesta uniforme: no revelar si el correo existe o su estado.
  if (usuario && usuario.estado !== 'activo') {
    await emitirCodigo(usuario);
  }

  res.json({ message: 'Si el correo tiene un registro pendiente, enviamos un codigo nuevo.' });
}

async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);
  const usuario = await usuariosRepo.buscarPorEmailConHash(email);

  const hash = usuario ? usuario.password_hash : DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);

  if (!usuario || !ok) {
    throw ApiError.unauthorized('Correo o contrasena incorrectos');
  }
  if (usuario.estado === 'pendiente') {
    throw ApiError.forbidden('Debes verificar tu correo antes de iniciar sesion.', 'EMAIL_NO_VERIFICADO');
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

module.exports = { register, verify, resend, login, me };
