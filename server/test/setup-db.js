'use strict';

/**
 * Prepara la base de datos de pruebas (clinicapp_test) desde cero antes de
 * correr las pruebas: la borra, la vuelve a crear, da permisos al usuario de
 * la app y aplica todas las migraciones.
 *
 * Usa el MySQL de docker-compose (expuesto en 127.0.0.1:3306) con el usuario
 * root (MYSQL_ROOT_PASSWORD del .env). Nunca toca la base de datos de
 * desarrollo.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { TEST_DB_NAME, TEST_DB_HOST } = require('./test-env');

async function main() {
  const rootPassword = process.env.TEST_DB_ROOT_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || 'root';
  const appUser = process.env.DB_USER;
  if (!appUser) throw new Error('Falta DB_USER en el .env');

  const conn = await mysql.createConnection({
    host: TEST_DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: 'root',
    password: rootPassword,
  });

  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\``);
    await conn.query(
      `CREATE DATABASE \`${TEST_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`GRANT ALL PRIVILEGES ON \`${TEST_DB_NAME}\`.* TO ?@'%'`, [appUser]);
  } finally {
    await conn.end();
  }

  execFileSync(process.execPath, [path.resolve(__dirname, '../db/migrate.js')], {
    stdio: 'inherit',
    env: { ...process.env, DB_HOST: TEST_DB_HOST, DB_NAME: TEST_DB_NAME },
  });

  console.log(`[test] base de datos ${TEST_DB_NAME} lista`);
}

main().catch((err) => {
  console.error('[test] no se pudo preparar la base de datos de pruebas:', err.message);
  console.error('[test] Revisa que el contenedor de MySQL este corriendo: docker compose up -d db');
  process.exit(1);
});
