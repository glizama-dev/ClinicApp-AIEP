'use strict';

const { query } = require('../db');

const PUBLIC_FIELDS =
  'id, nombre, email, rol, especialidad, estado, email_verificado_at, created_at';

async function crear({ nombre, email, passwordHash, rol, especialidad }) {
  const result = await query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol, especialidad, estado)
     VALUES (:nombre, :email, :passwordHash, :rol, :especialidad, 'pendiente')`,
    { nombre, email, passwordHash, rol, especialidad }
  );
  return buscarPorId(result.insertId);
}

async function buscarPorId(id) {
  const rows = await query(`SELECT ${PUBLIC_FIELDS} FROM usuarios WHERE id = :id`, { id });
  return rows[0] || null;
}

/** Incluye password_hash: usar solo para el flujo de login. */
async function buscarPorEmailConHash(email) {
  const rows = await query(
    `SELECT ${PUBLIC_FIELDS}, password_hash FROM usuarios WHERE email = :email`,
    { email }
  );
  return rows[0] || null;
}

async function buscarPorEmail(email) {
  const rows = await query(`SELECT ${PUBLIC_FIELDS} FROM usuarios WHERE email = :email`, { email });
  return rows[0] || null;
}

async function marcarVerificado(id) {
  await query(
    `UPDATE usuarios
     SET estado = 'activo', email_verificado_at = NOW()
     WHERE id = :id`,
    { id }
  );
  return buscarPorId(id);
}

module.exports = {
  crear,
  buscarPorId,
  buscarPorEmail,
  buscarPorEmailConHash,
  marcarVerificado,
};
