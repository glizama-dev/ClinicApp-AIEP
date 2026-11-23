'use strict';

const { query, withTransaction } = require('../db');

const PUBLIC_FIELDS =
  'id, nombre, email, rol, especialidad, estado, email_verificado_at, created_at';

async function crear({ nombre, email, passwordHash, rol, especialidad }) {
  const result = await query(
    `INSERT INTO usuarios
       (nombre, email, password_hash, rol, especialidad, estado, email_verificado_at, terminos_aceptados_at)
     VALUES (:nombre, :email, :passwordHash, :rol, :especialidad, 'activo', NOW(), NOW())`,
    { nombre, email, passwordHash, rol, especialidad }
  );
  return buscarPorId(result.insertId);
}

async function buscarPorId(id) {
  const rows = await query(`SELECT ${PUBLIC_FIELDS} FROM usuarios WHERE id = :id`, { id });
  return rows[0] || null;
}

/** Datos minimos para validar una sesion en cada request (incluye token_version). */
async function buscarSesion(id) {
  const rows = await query(
    'SELECT id, nombre, rol, especialidad, estado, token_version FROM usuarios WHERE id = :id',
    { id }
  );
  return rows[0] || null;
}

/** Incluye password_hash y token_version: usar solo para el flujo de login. */
async function buscarPorEmailConHash(email) {
  const rows = await query(
    `SELECT ${PUBLIC_FIELDS}, token_version, password_hash FROM usuarios WHERE email = :email`,
    { email }
  );
  return rows[0] || null;
}

async function buscarPorEmail(email) {
  const rows = await query(`SELECT ${PUBLIC_FIELDS} FROM usuarios WHERE email = :email`, { email });
  return rows[0] || null;
}

/**
 * Consume un token de recuperacion y cambia la contrasena de forma atomica.
 * Invalida todas las sesiones abiertas (token_version + 1) y los demas
 * enlaces de recuperacion pendientes del usuario.
 * @returns {Promise<boolean>} false si el token ya fue usado por otra solicitud.
 */
async function resetearPassword({ resetId, usuarioId, passwordHash }) {
  return withTransaction(async (conn) => {
    const [consumo] = await conn.execute(
      `UPDATE password_resets SET consumido_at = NOW()
       WHERE id = :resetId AND consumido_at IS NULL AND expira_at > NOW()`,
      { resetId }
    );
    if (consumo.affectedRows !== 1) return false;

    await conn.execute(
      `UPDATE usuarios
       SET password_hash = :passwordHash, token_version = token_version + 1
       WHERE id = :usuarioId`,
      { usuarioId, passwordHash }
    );
    await conn.execute(
      `UPDATE password_resets SET consumido_at = NOW()
       WHERE usuario_id = :usuarioId AND consumido_at IS NULL`,
      { usuarioId }
    );
    return true;
  });
}

module.exports = {
  crear,
  buscarPorId,
  buscarSesion,
  buscarPorEmail,
  buscarPorEmailConHash,
  resetearPassword,
};
