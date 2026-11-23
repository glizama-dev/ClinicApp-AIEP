'use strict';

const { query } = require('../db');

// El vencimiento se calcula con el reloj de MySQL (NOW()), el mismo que se usa
// al validarlo. Calcularlo en Node fallaba si el servidor de la app y MySQL
// tienen zonas horarias distintas (ej. app en hora de Chile y MySQL en UTC).
async function crear({ usuarioId, tokenHash, ttlMinutos }) {
  await query(
    `INSERT INTO password_resets (usuario_id, token_hash, expira_at)
     VALUES (:usuarioId, :tokenHash, NOW() + INTERVAL :ttlMinutos MINUTE)`,
    { usuarioId, tokenHash, ttlMinutos }
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
