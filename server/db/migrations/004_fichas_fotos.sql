-- Registro fotografico de seguimiento por ficha.

ALTER TABLE fichas
  ADD COLUMN fotos JSON NULL AFTER firmas;
