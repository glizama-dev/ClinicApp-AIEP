'use strict';

/**
 * Runner de migraciones minimalista.
 * Ejecuta en orden alfabetico los .sql de db/migrations que aun no esten
 * registrados en la tabla _migrations. Cada archivo se ejecuta completo
 * (soporta varias sentencias) dentro de una conexion con multipleStatements.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function connectWithRetry(attempts = 30, delayMs = 2000) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await mysql.createConnection({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        multipleStatements: true,
      });
    } catch (err) {
      if (i === attempts) throw err;
      console.log(`[migrate] MySQL no disponible aun (intento ${i}/${attempts}): ${err.code || err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('No se pudo conectar a MySQL');
}

async function run() {
  const conn = await connectWithRetry();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        nombre      VARCHAR(255) NOT NULL,
        aplicada_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (nombre)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
    `);

    const [applied] = await conn.query('SELECT nombre FROM _migrations');
    const appliedSet = new Set(applied.map((row) => row.nombre));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrate] aplicando ${file}...`);
      await conn.query(sql);
      await conn.query('INSERT INTO _migrations (nombre) VALUES (?)', [file]);
      count += 1;
    }

    console.log(count === 0 ? '[migrate] sin migraciones pendientes' : `[migrate] ${count} migracion(es) aplicada(s)`);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('[migrate] error:', err);
  process.exit(1);
});
