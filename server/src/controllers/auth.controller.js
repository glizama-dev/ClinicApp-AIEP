'use strict';

const bcrypt = require('bcryptjs');

const ApiError = require('../lib/ApiError');
const { signAccessToken } = require('../lib/tokens');
const usuariosRepo = require('../repositories/usuarios.repo');
const { registerSchema, loginSchema } = require('../validation/schemas');

const BCRYPT_COST = 12;

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

module.exports = { register, login, me };
