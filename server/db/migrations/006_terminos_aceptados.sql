-- Fecha en que el usuario acepto los Terminos y condiciones y la Politica de
-- privacidad al registrarse (respaldo del consentimiento, Ley 21.719).
-- Las cuentas creadas antes de este cambio quedan en NULL.

ALTER TABLE usuarios
  ADD COLUMN terminos_aceptados_at DATETIME NULL AFTER token_version;
