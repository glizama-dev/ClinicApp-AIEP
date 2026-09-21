'use strict';

const { query } = require('../db');

/** Invalida (marca como consumidos) todos los codigos vigentes de un usuario. */
async function invalidarVigentes(usuarioId) {
  await query(
    `UPDATE verificacion_codigos
     SET consumido_at = NOW()
     WHERE usuario_id = :usuarioId AND consumido_at IS NULL`,
    { usuarioId }
  );
}

async function crear({ usuarioId, codigoHash, ttlMinutos }) {
  await invalidarVigentes(usuarioId);
  await query(
    `INSERT INTO verificacion_codigos (usuario_id, codigo_hash, expira_at)
     VALUES (:usuarioId, :codigoHash, DATE_ADD(NOW(), INTERVAL :ttlMinutos MINUTE))`,
    { usuarioId, codigoHash, ttlMinutos }
  );
}

/** Devuelve el codigo vigente (no consumido) mas reciente del usuario. */
async function obtenerVigente(usuarioId) {
  const rows = await query(
    `SELECT id, usuario_id, codigo_hash, expira_at, intentos,
            (expira_at < NOW()) AS expirado
     FROM verificacion_codigos
     WHERE usuario_id = :usuarioId AND consumido_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    { usuarioId }
  );
  return rows[0] || null;
}

async function incrementarIntentos(id) {
  await query('UPDATE verificacion_codigos SET intentos = intentos + 1 WHERE id = :id', { id });
}

async function consumir(id) {
  await query('UPDATE verificacion_codigos SET consumido_at = NOW() WHERE id = :id', { id });
}

module.exports = { crear, obtenerVigente, incrementarIntentos, consumir, invalidarVigentes };
