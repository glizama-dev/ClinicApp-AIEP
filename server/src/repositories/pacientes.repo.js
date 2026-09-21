'use strict';

/**
 * Upsert de paciente por RUT. Actualiza los campos entregados sin borrar los
 * previos con valores nulos.
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {{rut:string, nombre:string, fechaNacimiento?:string|null, telefono?:string|null, email?:string|null}} data
 * @returns {Promise<number>} id del paciente
 */
async function upsert(conn, data) {
  const { rut, nombre, fechaNacimiento = null, telefono = null, email = null } = data;

  await conn.execute(
    `INSERT INTO pacientes (rut, nombre, fecha_nacimiento, telefono, email)
     VALUES (:rut, :nombre, :fechaNacimiento, :telefono, :email)
     ON DUPLICATE KEY UPDATE
       nombre = VALUES(nombre),
       fecha_nacimiento = COALESCE(VALUES(fecha_nacimiento), fecha_nacimiento),
       telefono = COALESCE(VALUES(telefono), telefono),
       email = COALESCE(VALUES(email), email)`,
    { rut, nombre, fechaNacimiento, telefono, email }
  );

  const [rows] = await conn.execute('SELECT id FROM pacientes WHERE rut = :rut', { rut });
  return rows[0].id;
}

module.exports = { upsert };
