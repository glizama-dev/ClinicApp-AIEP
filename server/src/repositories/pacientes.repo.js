'use strict';

/**
 * Registra al paciente por RUT si aun no existe. Si ya existe, NO modifica sus
 * datos: cualquier usuario puede crear fichas, asi que permitir que una ficha
 * nueva sobrescriba nombre/telefono/email dejaria a un usuario alterar los
 * datos de contacto de pacientes atendidos por otros. Cada ficha conserva su
 * propia copia del nombre (fichas.paciente_nombre).
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {{rut:string, nombre:string, fechaNacimiento?:string|null, telefono?:string|null, email?:string|null}} data
 * @returns {Promise<number>} id del paciente
 */
async function upsert(conn, data) {
  const { rut, nombre, fechaNacimiento = null, telefono = null, email = null } = data;

  await conn.execute(
    `INSERT INTO pacientes (rut, nombre, fecha_nacimiento, telefono, email)
     VALUES (:rut, :nombre, :fechaNacimiento, :telefono, :email)
     ON DUPLICATE KEY UPDATE id = id`,
    { rut, nombre, fechaNacimiento, telefono, email }
  );

  const [rows] = await conn.execute('SELECT id FROM pacientes WHERE rut = :rut', { rut });
  return rows[0].id;
}

module.exports = { upsert };
