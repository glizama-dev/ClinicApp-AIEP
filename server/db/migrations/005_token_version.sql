-- Version de sesion por usuario. Se incrementa al cambiar la contrasena para
-- invalidar todos los JWT emitidos antes del cambio.

ALTER TABLE usuarios
  ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER estado;
