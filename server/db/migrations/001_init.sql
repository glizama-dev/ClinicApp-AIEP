-- Esquema inicial de ClinicApp.

CREATE TABLE usuarios (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre               VARCHAR(150) NOT NULL,
  email                VARCHAR(190) NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  rol                  ENUM('estudiante', 'profesional', 'admin') NOT NULL,
  especialidad         ENUM('podologia', 'cosmetologia', 'ambas') NOT NULL,
  estado               ENUM('pendiente', 'activo', 'suspendido') NOT NULL DEFAULT 'pendiente',
  email_verificado_at  DATETIME NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE verificacion_codigos (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id   BIGINT UNSIGNED NOT NULL,
  codigo_hash  VARCHAR(255) NOT NULL,
  expira_at    DATETIME NOT NULL,
  intentos     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  consumido_at DATETIME NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_codigos_usuario (usuario_id, consumido_at),
  CONSTRAINT fk_codigos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE pacientes (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rut              VARCHAR(15) NOT NULL,
  nombre           VARCHAR(150) NOT NULL,
  fecha_nacimiento DATE NULL,
  telefono         VARCHAR(30) NULL,
  email            VARCHAR(190) NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pacientes_rut (rut)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE fichas (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  especialidad    ENUM('podologia', 'cosmetologia') NOT NULL,
  paciente_id     BIGINT UNSIGNED NULL,
  paciente_rut    VARCHAR(15) NOT NULL,
  paciente_nombre VARCHAR(150) NOT NULL,
  profesional_id  BIGINT UNSIGNED NOT NULL,
  fecha_atencion  DATE NOT NULL,
  estado          ENUM('borrador', 'finalizada') NOT NULL DEFAULT 'finalizada',
  datos           JSON NOT NULL,
  firmas          JSON NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fichas_especialidad_fecha (especialidad, fecha_atencion),
  KEY idx_fichas_profesional (profesional_id),
  KEY idx_fichas_paciente_rut (paciente_rut),
  CONSTRAINT fk_fichas_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE SET NULL,
  CONSTRAINT fk_fichas_profesional FOREIGN KEY (profesional_id) REFERENCES usuarios (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
