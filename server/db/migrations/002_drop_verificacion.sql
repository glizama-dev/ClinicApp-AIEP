-- Elimina el flujo de verificacion por correo (SMTP no es viable en produccion).
-- Las cuentas quedan activas de inmediato al registrarse.

UPDATE usuarios
SET estado = 'activo', email_verificado_at = NOW()
WHERE estado = 'pendiente';

DROP TABLE verificacion_codigos;

ALTER TABLE usuarios
  MODIFY estado ENUM('activo', 'suspendido') NOT NULL DEFAULT 'activo';
