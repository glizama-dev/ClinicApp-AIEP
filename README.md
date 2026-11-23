# ClinicApp

Fichas clínicas digitales para las prácticas de Podología y Cosmetología de AIEP.

- **Frontend:** HTML/CSS/JS estático (raíz del repo), sin build ni bundler.
- **Backend:** Node.js 20 + Express + MySQL 8 (`server/`), que sirve también el frontend.
- **Infra local:** Docker Compose (MySQL + API + Adminer).
- **Producción:** contenedor Docker (`server/Dockerfile`) desplegado en Railway.

La estructura de carpetas está descrita en [docs/ESTRUCTURA.md](docs/ESTRUCTURA.md).

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye `docker compose`).

## Puesta en marcha local (Docker)

```bash
# 1. Variables de entorno
cp .env.example .env
#   edita .env: define JWT_SECRET con una cadena larga y aleatoria
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# 2. Levantar todo (MySQL + API + Adminer)
docker compose up --build

# 3. (opcional, una sola vez) crear usuarios iniciales de desarrollo
docker compose exec api npm run seed
```

Servicios (solo accesibles desde el propio equipo, `127.0.0.1`):

| URL | Qué es |
|---|---|
| http://localhost:3000 | La app (frontend + API) |
| http://localhost:3000/api/health | Estado del backend |
| http://localhost:8080 | Adminer: interfaz web para ver la base de datos |
| localhost:3306 | MySQL |

Las credenciales de MySQL y Adminer son las definidas en tu `.env`
(`DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MYSQL_ROOT_PASSWORD`; en Adminer el
servidor es `db`). Los valores de `.env.example` son solo para desarrollo local.

Las migraciones se ejecutan solas al arrancar el contenedor `api`
(`npm run migrate`). Para volver a un estado limpio: `docker compose down -v`.

### Usuarios de desarrollo (`npm run seed`)

El seed crea un administrador y un profesional por especialidad. Sus correos y
contraseñas se configuran con las variables `SEED_*` del `.env`. En
`NODE_ENV=production` el seed se niega a correr si no se definen las
contraseñas explícitamente.

## Registro de usuarios

En la app: **Crear cuenta**. La cuenta queda activa de inmediato.

- **Estudiantes:** deben usar su correo institucional (`ALLOWED_EMAIL_DOMAIN`, por defecto `@correoaiep.cl`).
- **Profesionales:** pueden usar cualquier correo válido.
- **Contraseña:** mínimo 8 caracteres, con al menos una letra y un número.
- El rol `admin` no se puede obtener por registro; solo se crea con el seed o directamente en la base de datos.

La recuperación de contraseña envía un enlace por correo mediante la API HTTP
de [Brevo](https://www.brevo.com) (`BREVO_API_KEY`, `MAIL_FROM_EMAIL`). Sin esa
configuración, el enlace solo se escribe en el log del servidor.

## API

Base `/api`. Autenticación con `Authorization: Bearer <token>` (JWT, HS256).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Crea una cuenta activa y devuelve un token |
| POST | `/api/auth/login` | Inicia sesión y devuelve un token |
| POST | `/api/auth/forgot-password` | Envía el enlace de recuperación (respuesta genérica) |
| POST | `/api/auth/reset-password` | Cambia la contraseña con el token del enlace |
| GET | `/api/auth/me` | Usuario de la sesión actual |
| POST | `/api/fichas` | Registra una ficha |
| GET | `/api/fichas` | Lista fichas (`?rut=&especialidad=&desde=&hasta=&page=&pageSize=`) |
| GET | `/api/fichas/:id` | Detalle completo de una ficha |
| PUT | `/api/fichas/:id` | Actualiza `datos` / `firmas` / `fotos` / `estado` |

### Permisos

- Cada profesional o estudiante ve y edita **solo sus propias fichas**, y solo de su especialidad.
- El administrador ve todas las fichas.

### Modelo de datos de las fichas

Tabla `fichas`: columnas indexadas (`paciente_rut`, `paciente_nombre`,
`especialidad`, `fecha_atencion`, `profesional_id`, `estado`) + `datos` (JSON
con todo el formulario) + `firmas` y `fotos` (JSON con imágenes en dataURL
base64, PNG/JPEG/WebP). El paciente se registra además en la tabla `pacientes`
la primera vez que aparece su RUT; las fichas posteriores no modifican esos
datos.

## Seguridad

Resumen de las medidas implementadas:

- **Contraseñas:** bcrypt (costo 12). El login tarda lo mismo exista o no el correo.
- **Sesiones:** JWT firmado (HS256, 8 h por defecto). En cada request se revalida contra la base de datos: un usuario suspendido o que cambió su contraseña pierde el acceso de inmediato (`usuarios.token_version`).
- **Recuperación de contraseña:** token aleatorio de 256 bits, guardado como hash SHA-256, de un solo uso y válido por 30 minutos. Viaja en el fragmento de la URL (`#token=`) para que no quede en logs.
- **Validación:** todas las entradas se validan con zod; las consultas SQL son parametrizadas.
- **XSS:** las imágenes solo se aceptan como `data:image/(png|jpeg|webp);base64`, el frontend escapa todo contenido dinámico y se aplica Content-Security-Policy (`script-src 'self'`).
- **Cabeceras:** helmet (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy: no-referrer`).
- **Rate limiting:** por IP en cada ruta de autenticación, por cuenta en los intentos fallidos de login y un límite general para la API.
- **Secretos:** se leen desde variables de entorno; `.env` está excluido de git y de la imagen Docker.
- **Contenedor:** dependencias instaladas desde el lockfile (`npm ci`) y proceso ejecutado como usuario no root.

## Desarrollo

- El frontend se monta como volumen: editar `index.html`, `css/` o `js/` se
  refleja al recargar el navegador.
- Tras cambiar código del backend (`server/src`): `docker compose restart api`.
- Tras cambiar dependencias: `docker compose up -d --build --renew-anon-volumes api`.
- Correr el backend fuera de Docker: define `DB_HOST=localhost` en `.env` y luego
  `cd server && npm install && npm run migrate && npm run dev`.
- Auditoría de dependencias: `cd server && npm audit --omit=dev`.

## Pruebas automáticas

70 pruebas del backend con el runner nativo de Node (`node:test`), sin
dependencias adicionales. Cubren registro, inicio de sesión y sesiones,
recuperación de contraseña, fichas clínicas (incluidos los permisos entre
usuarios y el rechazo de imágenes maliciosas), formulario de contacto,
cabeceras de seguridad, límites de intentos y validación de RUT.

```bash
docker compose up -d db      # el MySQL de Docker debe estar corriendo
cd server
npm install                  # solo la primera vez
npm test
```

- Usan una base de datos aparte, `clinicapp_test`, que se borra y se vuelve a
  crear en cada ejecución. **No tocan la base de datos de desarrollo.**
- **No envían correos reales:** usan una clave de Brevo falsa e interceptan
  toda llamada a Brevo y a cualquier red externa.
- Necesitan `MYSQL_ROOT_PASSWORD` en el `.env` para crear la base de pruebas.
- Los archivos están en `server/test/` (`*.test.js`); `helpers.js` reúne las
  utilidades comunes (servidor de prueba, usuarios, correos interceptados).
