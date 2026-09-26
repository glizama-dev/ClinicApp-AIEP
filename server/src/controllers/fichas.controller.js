'use strict';

const ApiError = require('../lib/ApiError');
const { normalizarRut } = require('../lib/rut');
const fichasRepo = require('../repositories/fichas.repo');
const {
  fichaCreateSchema,
  fichaUpdateSchema,
  fichaListQuerySchema,
} = require('../validation/schemas');

/** mysql2 suele devolver JSON ya parseado; por si acaso, normalizamos. */
function parseJson(value) {
  if (value == null || typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function serializarFicha(row) {
  return {
    ...row,
    datos: parseJson(row.datos),
    firmas: parseJson(row.firmas),
    fotos: parseJson(row.fotos),
  };
}

function puedeUsarEspecialidad(user, especialidad) {
  return user.rol === 'admin' || user.especialidad === 'ambas' || user.especialidad === especialidad;
}

function esDuenoOAdmin(user, ficha) {
  return user.rol === 'admin' || Number(ficha.profesional_id) === user.id;
}

async function crear(req, res) {
  const data = fichaCreateSchema.parse(req.body);

  if (!puedeUsarEspecialidad(req.user, data.especialidad)) {
    throw ApiError.forbidden('No puedes registrar fichas de esta especialidad.');
  }

  const pacienteEmail = data.paciente.email ? data.paciente.email : null;

  const id = await fichasRepo.crear({
    especialidad: data.especialidad,
    fechaAtencion: data.fechaAtencion,
    estado: data.estado,
    profesionalId: req.user.id,
    paciente: {
      rut: normalizarRut(data.paciente.rut),
      nombre: data.paciente.nombre,
      fechaNacimiento: data.paciente.fechaNacimiento ?? null,
      telefono: data.paciente.telefono ?? null,
      email: pacienteEmail,
    },
    datos: data.datos,
    firmas: data.firmas ?? null,
    fotos: data.fotos ?? null,
  });

  res.status(201).json({ id, message: 'Ficha registrada correctamente.' });
}

async function listar(req, res) {
  const q = fichaListQuerySchema.parse(req.query);
  const puedeElegirEspecialidad = req.user.rol === 'admin' || req.user.especialidad === 'ambas';

  const filtros = {
    rut: q.rut ? normalizarRut(q.rut) : undefined,
    especialidad: puedeElegirEspecialidad ? q.especialidad : req.user.especialidad,
    desde: q.desde,
    hasta: q.hasta,
    page: q.page,
    pageSize: q.pageSize,
    profesionalId: req.user.rol === 'admin' ? undefined : req.user.id,
  };
  const resultado = await fichasRepo.listar(filtros);
  res.json(resultado);
}

async function detalle(req, res) {
  const ficha = await fichasRepo.buscarPorId(Number(req.params.id));
  if (!ficha) throw ApiError.notFound('Ficha no encontrada');
  if (!esDuenoOAdmin(req.user, ficha)) throw ApiError.forbidden('No puedes ver esta ficha.');
  res.json(serializarFicha(ficha));
}

async function actualizar(req, res) {
  const patch = fichaUpdateSchema.parse(req.body);
  const ficha = await fichasRepo.buscarPorId(Number(req.params.id));
  if (!ficha) throw ApiError.notFound('Ficha no encontrada');
  if (!esDuenoOAdmin(req.user, ficha)) throw ApiError.forbidden('No puedes editar esta ficha.');

  const actualizada = await fichasRepo.actualizar(ficha.id, patch);
  res.json(serializarFicha(actualizada));
}

module.exports = { crear, listar, detalle, actualizar };
