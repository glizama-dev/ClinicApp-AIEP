# ClinicApp

Fichas clínicas digitales para las prácticas de Podología y Cosmetología de AIEP.

- **Frontend:** HTML/CSS/JS estático (raíz del repo).
- **Backend:** Node.js + Express + MySQL (`server/`), servido junto al frontend.
- **Infra local:** Docker Compose (MySQL 8 + Mailhog + API).

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye `docker compose`).

## Puesta en marcha (Docker)

```bash
# 1. Variables de entorno
cp .env.example .env
#   edita .env y cambia JWT_SECRET por una cadena larga y aleatoria

# 2. Levantar todo (MySQL + Mailhog + API)
docker compose up --build

# 3. (una sola vez) crear usuarios iniciales ya verificados
docker compose exec api npm run seed
```

Servicios:

| URL | Qué es |
|---|---|
| http://localhost:3000 | La app (frontend + API) |
| http://localhost:3000/api/health | Estado del backend |
| http://localhost:8025 | Mailhog — aquí llegan los correos con el código de verificación |
| http://localhost:8080 | Adminer — interfaz web para ver/editar la base de datos |
| localhost:3306 | MySQL (user/pass/base según `.env`) |

Adminer — datos de conexión: motor `MySQL`, servidor `db`, usuario `clinicapp`,
contraseña `clinicapp`, base `clinicapp` (o `root`/`root` para acceso total).

Las migraciones se ejecutan solas al arrancar el contenedor `api`
(`npm run migrate`). Para volver a un estado limpio: `docker compose down -v`.

## Registro de usuarios reales

1. En la app: **Crear cuenta** con un correo `@correoaiep.cl`.
2. El backend envía un **código de 6 dígitos** a ese correo.
   - En local, ábrelo en **Mailhog** (http://localhost:8025).
3. Ingresa el código en el modal → la cuenta queda activa y se inicia sesión.

El código vence a los `CODE_TTL_MINUTES` minutos y se bloquea tras
`CODE_MAX_ATTEMPTS` intentos fallidos (configurables en `.env`).

### Usuarios de la semilla (`npm run seed`)

| Correo | Contraseña | Rol |
|---|---|---|
| admin@correoaiep.cl | admin12345 | admin |
| podologia@correoaiep.cl | 12345678 | profesional (podología) |
| cosmetologia@correoaiep.cl | 12345678 | profesional (cosmetología) |

Cámbialas con `SEED_*` en `.env` antes de correr el seed.

## API

Base `/api`. Autenticación con `Authorization: Bearer <token>` (JWT).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Crea cuenta pendiente y envía el código |
| POST | `/api/auth/verify` | Confirma el código → devuelve token |
| POST | `/api/auth/resend` | Reenvía el código |
| POST | `/api/auth/login` | Inicia sesión → devuelve token |
| GET | `/api/auth/me` | Usuario del token |
| POST | `/api/fichas` | Registra una ficha |
| GET | `/api/fichas` | Lista fichas (`?rut=&especialidad=&desde=&hasta=&page=&pageSize=`) |
| GET | `/api/fichas/:id` | Detalle completo de una ficha |
| PUT | `/api/fichas/:id` | Actualiza `datos` / `firmas` / `estado` |

### Modelo de datos de las fichas

Tabla `fichas`: columnas indexadas (`paciente_rut`, `paciente_nombre`,
`especialidad`, `fecha_atencion`, `profesional_id`, `estado`) + columna `datos`
(JSON con todo el formulario) + `firmas` (JSON con las firmas en PNG dataURL).
El paciente se guarda además en la tabla `pacientes` (upsert por RUT).

## Desarrollo

- El frontend se monta como volumen: editar `index.html`, `css/`, `js/` se
  refleja al recargar el navegador.
- Tras cambiar código del backend (`server/src`): `docker compose restart api`.
- Correr el backend fuera de Docker: define `DB_HOST=localhost` en `.env`,
  `cd server && npm install && npm run migrate && npm run dev`.

## Producción (correo real)

Cambiar en `.env` las variables `SMTP_*` por las de un relay real (p. ej. Google
Workspace de AIEP con *app password*). No requiere cambios de código.
