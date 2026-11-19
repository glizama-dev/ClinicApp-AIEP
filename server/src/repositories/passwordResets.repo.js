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
    `SELECT id, usuario_id FROM password_resets
     WHERE token_hash = :tokenHash AND consumido_at IS NULL AND expira_at > NOW()`,
    { tokenHash }
  );
  return rows[0] || null;
}

// El consumo del token se hace en usuariosRepo.resetearPassword (transaccion atomica).
module.exports = { crear, buscarVigentePorHash };
