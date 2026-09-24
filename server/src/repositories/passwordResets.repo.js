'use strict';

const { query } = require('../db');

async function crear({ usuarioId, tokenHash, expiraAt }) {
  await query(
    `INSERT INTO password_resets (usuario_id, token_hash, expira_at)
     VALUES (:usuarioId, :tokenHash, :expiraAt)`,
    { usuarioId, tokenHash, expiraAt }
  );
}

async function buscarVigentePorHash(tokenHash) {
  const rows = await query(
    `SELECT * FROM password_resets
     WHERE token_hash = :tokenHash AND consumido_at IS NULL AND expira_at > NOW()`,
    { tokenHash }
  );
  return rows[0] || null;
}

async function marcarConsumido(id) {
  await query('UPDATE password_resets SET consumido_at = NOW() WHERE id = :id', { id });
}

module.exports = { crear, buscarVigentePorHash, marcarConsumido };
