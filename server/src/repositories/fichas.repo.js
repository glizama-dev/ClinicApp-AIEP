'use strict';

const { query, withTransaction } = require('../db');
const pacientesRepo = require('./pacientes.repo');

const LIST_FIELDS = `
  id, especialidad, paciente_rut, paciente_nombre, profesional_id,
  fecha_atencion, estado, created_at, updated_at
`;

/**
 * Crea una ficha y hace upsert del paciente en la misma transaccion.
 * @param {{
 *   especialidad:string, fechaAtencion:string, estado:string,
 *   profesionalId:number,
 *   paciente:{rut:string,nombre:string,fechaNacimiento?:string|null,telefono?:string|null,email?:string|null},
 *   datos:object, firmas:object|null
 * }} input
 */
async function crear(input) {
  return withTransaction(async (conn) => {
    const pacienteId = await pacientesRepo.upsert(conn, input.paciente);

    const [result] = await conn.execute(
      `INSERT INTO fichas
         (especialidad, paciente_id, paciente_rut, paciente_nombre,
          profesional_id, fecha_atencion, estado, datos, firmas, fotos)
       VALUES
         (:especialidad, :pacienteId, :pacienteRut, :pacienteNombre,
          :profesionalId, :fechaAtencion, :estado, :datos, :firmas, :fotos)`,
      {
        especialidad: input.especialidad,
        pacienteId,
        pacienteRut: input.paciente.rut,
        pacienteNombre: input.paciente.nombre,
        profesionalId: input.profesionalId,
        fechaAtencion: input.fechaAtencion,
        estado: input.estado,
        datos: JSON.stringify(input.datos),
        firmas: input.firmas ? JSON.stringify(input.firmas) : null,
        fotos: input.fotos ? JSON.stringify(input.fotos) : null,
      }
    );

    return result.insertId;
  });
}

async function buscarPorId(id) {
  const rows = await query(
    `SELECT ${LIST_FIELDS}, paciente_id, datos, firmas, fotos FROM fichas WHERE id = :id`,
    { id }
  );
  return rows[0] || null;
}

/**
 * Lista fichas con filtros y paginacion.
 * @param {{rut?:string, especialidad?:string, desde?:string, hasta?:string,
 *   profesionalId?:number, page:number, pageSize:number}} f
 */
async function listar(f) {
  const where = [];
  const params = {};

  if (f.rut) {
    where.push('paciente_rut = :rut');
    params.rut = f.rut;
  }
  if (f.especialidad) {
    where.push('especialidad = :especialidad');
    params.especialidad = f.especialidad;
  }
  if (f.desde) {
    where.push('fecha_atencion >= :desde');
    params.desde = f.desde;
  }
  if (f.hasta) {
    where.push('fecha_atencion <= :hasta');
    params.hasta = f.hasta;
  }
  if (f.profesionalId) {
    where.push('profesional_id = :profesionalId');
    params.profesionalId = f.profesionalId;
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = f.pageSize;
  const offset = (f.page - 1) * f.pageSize;

  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM fichas ${whereSql}`,
    params
  );

  const rows = await query(
    `SELECT ${LIST_FIELDS} FROM fichas ${whereSql}
     ORDER BY fecha_atencion DESC, id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { total: Number(total), page: f.page, pageSize: f.pageSize, items: rows };
}

/**
 * Actualiza datos / firmas / estado de una ficha existente.
 * @param {number} id
 * @param {{datos?:object, firmas?:object|null, estado?:string}} patch
 */
async function actualizar(id, patch) {
  const sets = [];
  const params = { id };

  if (patch.datos !== undefined) {
    sets.push('datos = :datos');
    params.datos = JSON.stringify(patch.datos);
  }
  if (patch.firmas !== undefined) {
    sets.push('firmas = :firmas');
    params.firmas = patch.firmas ? JSON.stringify(patch.firmas) : null;
  }
  if (patch.fotos !== undefined) {
    sets.push('fotos = :fotos');
    params.fotos = patch.fotos ? JSON.stringify(patch.fotos) : null;
  }
  if (patch.estado !== undefined) {
    sets.push('estado = :estado');
    params.estado = patch.estado;
  }

  if (sets.length === 0) return buscarPorId(id);

  await query(`UPDATE fichas SET ${sets.join(', ')} WHERE id = :id`, params);
  return buscarPorId(id);
}

module.exports = { crear, buscarPorId, listar, actualizar };
