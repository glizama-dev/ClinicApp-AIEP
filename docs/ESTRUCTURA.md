# Estructura del proyecto — ClinicApp

Fichas clínicas digitales para las prácticas de Podología y Cosmetología de AIEP.

## Vista general

```
ClinicApp/
├── Frontend estático (raíz)   → HTML + CSS + JS que sirve Express
├── server/                    → Backend Node/Express + MySQL
└── Infra / configuración      → Docker, variables de entorno, ignores
```

El backend sirve el frontend: `STATIC_DIR` apunta por defecto a la raíz del repo,
así que no hay build ni bundler. El navegador carga los `.html` de la raíz y estos
consumen la API en `/api`.

---

## Árbol completo anotado

```
ClinicApp/
│
├── index.html                     # Landing + login/registro (modal)
├── ficha-podologia.html           # Formulario de ficha clínica de podología
├── ficha-cosmetologia.html        # Formulario de ficha clínica de cosmetología
│
├── css/
│   ├── style.css                  # Estilos de la landing y componentes comunes
│   └── ficha.css                  # Estilos de las fichas (sidebar, scroll-spy, print)
│
├── js/
│   ├── api.js                     # Cliente HTTP: token/usuario en storage, fetch a /api  → window.ClinicAppApi
│   ├── auth.js                    # Sesión y control de acceso por especialidad          → window.ClinicAppAuth
│   ├── main.js                    # Lógica de la landing: header, login/registro
│   ├── ficha-common.js            # Utilidades compartidas por las fichas (formToObject, leerFirmas, hoyISO)  → window.ClinicAppFicha
│   ├── ficha-podologia.js         # Comportamiento de la ficha de podología (scroll-spy, envío)
│   └── ficha-cosmetologia.js      # Comportamiento de la ficha de cosmetología
│
├── img/
│   ├── 1-simbologia-podologica.png
│   ├── 2-swme.png
│   ├── 3-topografia-ungueal.png
│   └── 4-morfologia-antepie.png   # Láminas de referencia usadas en la ficha de podología
│
├── server/                        # ── BACKEND ──
│   ├── package.json               # Deps (express, mysql2, jsonwebtoken, zod…) y scripts start/dev/migrate/seed
│   ├── package-lock.json
│   ├── Dockerfile                 # Imagen de la API (build context = raíz del repo)
│   ├── node_modules/              # (ignorado)
│   │
│   ├── db/
│   │   ├── migrate.js             # Runner de migraciones (aplica los .sql pendientes vía tabla _migrations)
│   │   ├── seed.js                # Crea usuarios iniciales (idempotente)
│   │   └── migrations/
│   │       ├── 001_init.sql       # Esquema: usuarios, verificacion_codigos, pacientes, fichas
│   │       └── 002_drop_verificacion.sql  # Elimina verificacion_codigos; usuarios.estado activo por defecto
│   │
│   ├── public/                    # Punto de montaje del frontend en Docker (archivos vacíos en local → ver notas)
│   │
│   └── src/
│       ├── index.js               # Bootstrap de Express: middlewares, montaje de rutas, estáticos, listen
│       ├── config.js              # Lee .env de la raíz y expone config tipada (db, jwt, auth…)
│       ├── db.js                  # Pool de conexiones MySQL + helper query()
│       │
│       ├── routes/
│       │   ├── auth.routes.js     # POST /register /login · GET /me
│       │   └── fichas.routes.js   # POST / · GET / · GET /:id · PUT /:id   (todas con requireAuth)
│       │
│       ├── controllers/
│       │   ├── auth.controller.js     # Registro (cuenta activa de inmediato), login, me
│       │   └── fichas.controller.js   # Crear / listar (con filtros) / detalle / actualizar fichas
│       │
│       ├── repositories/          # Acceso a datos (SQL) — una por tabla/agregado
│       │   ├── usuarios.repo.js
│       │   ├── pacientes.repo.js  # Upsert de paciente por RUT
│       │   └── fichas.repo.js     # Columnas indexadas + datos/firmas en JSON
│       │
│       ├── middleware/
│       │   ├── auth.js            # requireAuth: valida el JWT Bearer
│       │   ├── error.js           # notFound + errorHandler centralizado
│       │   └── rateLimit.js       # authLimiter
│       │
│       ├── validation/
│       │   └── schemas.js         # Esquemas Zod de los payloads (auth y fichas)
│       │
│       └── lib/
│           ├── ApiError.js        # Error HTTP con código y status
│           ├── asyncHandler.js    # Envuelve controllers async → next(err)
│           ├── tokens.js          # signAccessToken
│           └── rut.js             # normalizarRut (formato chileno, sin validar DV)
│
├── docker-compose.yml             # db (MySQL 8) · adminer · api
├── .env                           # Variables reales (ignorado por git)
├── .env.example                   # Plantilla de configuración
├── .dockerignore
├── .gitignore
├── README.md                      # Puesta en marcha, usuarios semilla, API, modelo de datos
└── docs/
    └── ESTRUCTURA.md              # Este documento
```

---

## Capas del backend (flujo de una petición)

```
HTTP → index.js → routes/ → middleware (auth, rateLimit, validation)
     → controllers/ (orquesta, arma la respuesta)
     → repositories/ (SQL) → db.js (pool MySQL)
     → lib/ como apoyo transversal
```

- **routes/**: definen las URL y encadenan middlewares. No tienen lógica.
- **controllers/**: orquestan el caso de uso y construyen la respuesta HTTP.
- **repositories/**: única capa que escribe SQL. Un archivo por tabla/agregado.
- **middleware/**: preocupaciones transversales (auth, errores, rate limit).
- **validation/**: contratos de entrada con Zod, antes de tocar el controller.
- **lib/**: utilidades puras y reutilizables sin estado de request.

---

## API (base `/api`, JWT `Authorization: Bearer <token>`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Crea cuenta activa → devuelve token |
| POST | `/api/auth/login` | Inicia sesión → devuelve token |
| GET | `/api/auth/me` | Usuario del token |
| POST | `/api/fichas` | Registra una ficha |
| GET | `/api/fichas` | Lista fichas (`?rut=&especialidad=&desde=&hasta=&page=&pageSize=`) |
| GET | `/api/fichas/:id` | Detalle completo de una ficha |
| PUT | `/api/fichas/:id` | Actualiza `datos` / `firmas` / `estado` |
| GET | `/api/health` | Estado del backend |

---

## Modelo de datos (`server/db/migrations/`)

| Tabla | Rol |
|---|---|
| `usuarios` | Cuentas; `estado` activo/suspendido, `rol` y `especialidad` |
| `pacientes` | Upsert por `rut` único |
| `fichas` | Columnas indexadas (`paciente_rut`, `paciente_nombre`, `especialidad`, `fecha_atencion`, `profesional_id`, `estado`) + `datos` JSON (formulario completo) + `firmas` JSON (PNG dataURL) |

---

## Infraestructura local (`docker-compose.yml`)

| Servicio | Puerto | Para qué |
|---|---|---|
| `api` | 3000 | App completa (frontend + API); monta la raíz como volumen para recarga |
| `db` | 3306 | MySQL 8; datos persistentes en el volumen `db_data` |
| `adminer` | 8080 | Interfaz web para inspeccionar la base de datos |

Migraciones y arranque: el contenedor `api` ejecuta `npm run migrate && npm start`.
Semilla de usuarios: `docker compose exec api npm run seed`.
Estado limpio: `docker compose down -v`.

---

## Notas y recomendaciones

- **`server/public/`**: en local contiene archivos y carpetas vacíos creados por
  los *volumes* de `docker-compose`. El contenido real llega por montaje
  (`./index.html:/app/public/…`, `./css`, `./js`, `./img`) o por `COPY` en el
  `Dockerfile`. Conviene añadir `server/public/` al `.gitignore` para no
  versionar esos placeholders.
- **Sin duplicación de frontend**: sólo existe una copia (la raíz del repo).
  Nunca copiar manualmente los `.html`/`css`/`js` dentro de `server/public`.
- **`.env` vive en la raíz** y lo comparten Node (`config.js` lo lee con una ruta
  relativa a `server/src`) y `docker-compose` (`env_file`).
- **Convención de nombres del backend**: sufijos `*.routes.js`, `*.controller.js`,
  `*.repo.js` para mantener clara la capa a la que pertenece cada archivo.
