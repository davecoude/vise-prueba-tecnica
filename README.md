<p align="center">
  <img src="assets/vise-logo.png" alt="VISE" width="220" />
</p>

<h1 align="center">Prueba técnica · Desarrollador Full Stack</h1>
<p align="center">VISE Ltda — Mini sistema de inventario + RPA de consulta de antecedentes</p>

---

> **Estado:** en desarrollo. Este README se completa por bloques; la sección [Avance](#avance) indica qué está terminado.

## Contenido

- [Avance](#avance)
- [Arquitectura](#arquitectura)
- [Inicio rápido (Docker)](#inicio-rápido-docker)
- [Parte 1: Inventario](#parte-1-inventario)
- [Parte 2: RPA de antecedentes](#parte-2-rpa-de-antecedentes)
- [Variables de entorno](#variables-de-entorno)
- [Estructura del repositorio](#estructura-del-repositorio)

## Avance

| Bloque | Alcance | Estado |
|---|---|---|
| 0 | Monorepo, PostgreSQL en Docker, `.env.example` | ✅ |
| 1 | NestJS + TypeORM: entidades, migraciones y seed | ✅ |
| 2 | Autenticación JWT con guard global | ✅ |
| 3 | CRUD de productos y categorías, paginación, filtros, stock bajo | ✅ |
| 4 | Movimientos y kardex con control de concurrencia + pruebas unitarias | ✅ |
| 5 | Swagger, health check y Dockerfile del backend | ✅ |
| 6 | Frontend Vue 3 | ✅ |
| 7–9 | RPA: servicio simulado, lector, validador, cliente con reintentos, reporte, log, CLI y pruebas | 🧪 En validación |
| 10 | `DECISIONES.md`, prueba integral y entrega | ⏳ Pendiente |

## Arquitectura

```
                         ┌──────────────────── docker compose ────────────────────┐
 Navegador ── :8080 ──►  │ frontend (nginx + Vue 3) ── /api ──► backend (NestJS)  │
                         │                                         │  :3000        │
                         │                                         ▼               │
                         │                                    db (PostgreSQL 16)   │
                         │                                         :5433 (host)    │
                         │                                                         │
 rpa/data/cedulas.xlsx ─►│ rpa (Python, batch) ── HTTP ──► antecedentes-mock       │
 rpa/output/  ◄──────────│        │                         (FastAPI) :8000       │
 rpa/logs/    ◄──────────│────────┘                                                │
                         └─────────────────────────────────────────────────────────┘
```

## Inicio rápido (Docker)

**Requisitos:** Docker Desktop (o Docker Engine + Compose v2) y Git.

```bash
git clone <url-del-repositorio> vise-prueba-tecnica
cd vise-prueba-tecnica
cp .env.example .env          # en Windows (PowerShell): Copy-Item .env.example .env
docker compose up -d --build  # la primera vez tarda unos minutos
docker compose ps             # db, backend, frontend y antecedentes-mock en (healthy)
```

| Servicio | URL |
|---|---|
| Aplicación web (inventario) | http://localhost:8080 |
| API REST | http://localhost:3000/api |
| Documentación de la API (Swagger) | http://localhost:3000/api/docs |
| Servicio simulado de antecedentes | http://localhost:8000/docs |

**Usuario de prueba** (creado por el seed): `admin@vise.com` / `Admin123*`

Al levantar el stack, el backend aplica las migraciones y el seed automáticamente, y el **RPA se ejecuta una vez** con el archivo de ejemplo. Su reporte queda en `rpa/output/` y el log en `rpa/logs/`.

```bash
docker compose logs rpa       # resumen de la ejecución del RPA
docker compose run --rm rpa   # volver a ejecutar el RPA
docker compose down           # detener (agrega -v para borrar también los datos de la BD)
```

## Parte 1: Inventario

**Stack:** NestJS 12 · TypeORM 1 · PostgreSQL 16 · Vue 3 + Vite · Docker.

### Funcionalidades

- Login con JWT (bcrypt para contraseñas, token con expiración). Todas las rutas están protegidas por un guard global; solo `login` y `health` son públicas.
- CRUD de productos con validación; el SKU es único y se normaliza en mayúsculas.
- Listado con paginación, filtro por categoría y búsqueda por nombre o SKU.
- Entradas y salidas de inventario. Una salida que deje el stock en negativo se rechaza con `409`.
- Kardex por producto con saldo acumulado en cada movimiento.
- Productos con stock por debajo de un umbral configurable.
- Migraciones y datos semilla.

### Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Inicia sesión y devuelve el JWT |
| `GET` | `/api/products?page&limit&categoryId&search` | Listado paginado con filtros |
| `GET` | `/api/products/low-stock?threshold` | Productos con stock bajo el umbral |
| `POST` / `PATCH` / `DELETE` | `/api/products[/:id]` | Crear, editar y eliminar productos |
| `POST` | `/api/products/:id/movements` | Registrar una entrada o salida |
| `GET` | `/api/products/:id/kardex` | Historial con saldo acumulado |
| `GET` | `/api/categories` | Categorías |

La referencia completa, con esquemas y códigos de respuesta, está en Swagger.

### Concurrencia del stock

Cada movimiento se registra en una transacción que bloquea la fila del producto (`SELECT … FOR UPDATE`). Las operaciones simultáneas sobre un mismo producto se serializan, el saldo se calcula siempre con el stock vigente y una restricción `CHECK (stock >= 0)` en la base de datos actúa como última barrera.

### Pruebas

```bash
cd inventario/backend
npm install
npm test                  # pruebas unitarias del servicio de movimientos
npm run test:concurrency  # 20 salidas simultáneas contra la API en ejecución
```

### Desarrollo local (sin Docker para backend y frontend)

```bash
docker compose up -d db
cd inventario/backend && npm install && npm run start:dev   # requiere inventario/backend/.env.local con DB_HOST=localhost y DB_PORT=5433
cd inventario/frontend && npm install && npm run dev       # http://localhost:5173
```

## Parte 2: RPA de antecedentes

> Esta prueba usa un **servicio simulado con datos ficticios**. Las consultas reales de antecedentes requieren autorización del titular y el uso de canales oficiales.

**Stack:** Python 3.12 · openpyxl · requests · logging · FastAPI (servicio simulado) · Docker.

### Flujo

1. **Lector:** lee la columna `cedula` de `cedulas.xlsx`.
2. **Validador:** acepta solo cédulas de 6 a 10 dígitos y elimina duplicados antes de consultar.
3. **Cliente HTTP:** consulta cada cédula con reintentos y espera exponencial (con jitter). Si una consulta falla, el proceso continúa.
4. **Reporte:** genera `reporte_antecedentes.xlsx` con las columnas `cedula`, `nombres`, `estado`, `detalle` y `fecha_consulta`, e imprime el resumen en consola.

Las cédulas inválidas no se consultan: aparecen en el reporte con estado `error` y el motivo en `detalle`.

### Ejecución por línea de comandos (sin Docker)

```bash
cd rpa
python -m venv .venv
source .venv/bin/activate              # Windows (Git Bash): source .venv/Scripts/activate
pip install -e ".[dev]" -r mock_service/requirements.txt

# Terminal 1: servicio simulado
cd mock_service && uvicorn app:app --port 8000

# Terminal 2: RPA
rpa-antecedentes --input data/cedulas.xlsx --output output/reporte_antecedentes.xlsx
rpa-antecedentes --help                # todas las opciones
```

Códigos de salida: `0` proceso completado, `2` archivo de entrada inválido, `1` error inesperado.

### Casos de prueba incluidos en `rpa/data/cedulas.xlsx`

| Caso | Resultado esperado |
|---|---|
| Cédulas válidas | `limpio`, `con antecedentes` o `no encontrado` |
| Duplicadas (incluso texto vs número) | Se consultan una sola vez |
| 5 u 11 dígitos, con puntos o letras | `error` con el motivo, sin consulta |
| Terminada en `13` | Dos fallos `503` y luego responde: muestra un reintento exitoso |
| Terminada en `99` | Siempre `500`: agota los reintentos y queda en `error` |
| Terminada en `77` | Más lenta que el timeout: reintentos por timeout y queda en `error` |

### Pruebas

```bash
cd rpa
python -m pytest     # incluye datos inválidos y servicio caído
```

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Las principales:

| Variable | Uso |
|---|---|
| `DB_*` | Conexión a PostgreSQL |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Firma y expiración del token |
| `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` | Usuario de prueba |
| `LOW_STOCK_DEFAULT_THRESHOLD` | Umbral por defecto de stock bajo |
| `API_HOST_PORT`, `WEB_HOST_PORT`, `MOCK_HOST_PORT` | Puertos publicados en el host |
| `MOCK_FAILURE_RATE` | Probabilidad de fallos aleatorios del servicio simulado |
| `RPA_TIMEOUT_S`, `RPA_MAX_REINTENTOS` | Política de reintentos del RPA |

## Estructura del repositorio

```
├── assets/                  Logo de VISE
├── inventario/
│   ├── backend/             API NestJS (módulos auth, products, categories, movements)
│   └── frontend/            Interfaz Vue 3 servida por nginx
├── rpa/
│   ├── src/rpa_antecedentes/  reader · validator · client · report · pipeline · cli
│   ├── mock_service/        Servicio simulado de antecedentes (FastAPI)
│   ├── tests/               Pruebas del RPA
│   ├── data/                Excel de entrada de ejemplo
│   ├── output/              Reportes generados
│   └── logs/                Logs por ejecución
├── docker-compose.yml
├── .env.example
└── DECISIONES.md            Decisiones técnicas (pendiente)
```
