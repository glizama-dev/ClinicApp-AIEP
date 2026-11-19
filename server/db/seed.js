'use strict';

/**
 * Crea usuarios iniciales ya verificados (idempotente).
 * - 1 admin
 * - usuarios equivalentes a los antiguos de prueba, para no perder acceso
 *
 * Las contrasenas se pueden sobrescribir por env: SEED_ADMIN_PASSWORD, etc.
 */

const bcrypt = require('bcryptjs');
const { pool, query } = require('../src/db');

const USUARIOS = [
  {
    nombre: 'Administrador ClinicApp',
    email: (process.env.SEED_ADMIN_EMAIL || 'admin@correoaiep.cl').toLowerCase(),
    password: process.env.SEED_ADMIN_PASSWORD || 'admin12345',
    rol: 'admin',
    especialidad: 'ambas',
  },
  {
    nombre: 'Usuario Podologia',
    email: 'podologia@correoaiep.cl',
    password: process.env.SEED_PODO_PASSWORD || '12345678',
    rol: 'profesional',
    especialidad: 'podologia',
  },
  {
    nombre: 'Usuario Cosmetologia',
    email: 'cosmetologia@correoaiep.cl',
    password: process.env.SEED_COSME_PASSWORD || '12345678',
    rol: 'profesional',
    especialidad: 'cosmetologia',
  },
];

async function run() {
  // En produccion no se permiten contrasenas por defecto conocidas.
  if (process.env.NODE_ENV === 'production') {
    const faltantes = ['SEED_ADMIN_PASSWORD', 'SEED_PODO_PASSWORD', 'SEED_COSME_PASSWORD']
      .filter((name) => !process.env[name]);
    if (faltantes.length) {
      throw new Error(`En produccion debes definir: ${faltantes.join(', ')} (no se usan contrasenas por defecto)`);
    }
  }

  for (const u of USUARIOS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, especialidad, estado, email_verificado_at)
       VALUES (:nombre, :email, :passwordHash, :rol, :especialidad, 'activo', NOW())
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre),
         rol = VALUES(rol),
         especialidad = VALUES(especialidad),
         estado = 'activo',
         email_verificado_at = COALESCE(email_verificado_at, NOW())`,
      { ...u, passwordHash }
    );
    console.log(`[seed] usuario listo: ${u.email} (${u.rol})`);
  }
  await pool.end();
}

run().catch((err) => {
  console.error('[seed] error:', err);
  process.exit(1);
});
