# Decisiones técnicas

Aquí resumo por qué tomé cada decisión importante. La idea fue no complicarme de más, pero sí cubrir bien lo que la prueba evalúa: consistencia del stock, seguridad, manejo de errores y pruebas.

## Parte 1: Inventario

- **NestJS + TypeORM + PostgreSQL.** TypeORM soporta *locks* pesimistas y migraciones de forma nativa, que era justo lo que necesitaba para el kardex. El esquema se maneja **solo con migraciones** (`synchronize: false`) y el backend las aplica al arrancar.
- **Concurrencia del stock.** Cada movimiento corre en una transacción que bloquea la fila del producto con `SELECT … FOR UPDATE`. Así, dos salidas al mismo producto se atienden una detrás de otra y nunca calculan el saldo con un stock viejo. Además dejé un `CHECK (stock >= 0)` en la base de datos como última barrera. Elegí lock pesimista y no optimista porque en inventario es normal que muchas salidas compitan por el mismo producto, y con el optimista habría muchos reintentos. Lo comprobé con un script que lanza 20 salidas simultáneas (`npm run test:concurrency`).
- **Saldo guardado en cada movimiento.** Cada movimiento guarda el `balance_after`, así el kardex sale directo sin recalcular y queda un historial auditable. El kardex se ordena por `id` y no por fecha, porque el `id` se asigna mientras se tiene el lock y refleja el orden real.
- **El stock no se edita desde el CRUD.** Solo cambia con entradas y salidas; así el kardex y el stock siempre cuadran. Por la misma razón el `PATCH` de productos usa un `update` parcial que nunca toca la columna `stock`.
- **Seguridad.** Contraseñas con bcrypt, JWT con expiración configurable y un **guard global**: todo endpoint nace protegido y solo `login` y `health` son públicos con `@Public()`. El login responde igual si el correo no existe o la clave está mal, para no revelar qué usuarios hay.
- **Errores y códigos HTTP.** `ValidationPipe` global (400) y un filtro que traduce los errores de PostgreSQL a respuestas claras: SKU duplicado o registro con movimientos → 409, sin mostrar nunca el SQL.
- **Frontend en Vue 3 sin librería de componentes**, para tener pocas dependencias y una interfaz con la paleta de VISE. nginx sirve la app y redirige `/api` al backend, así que no hace falta configurar CORS.

## Parte 2: RPA

- **Servicio simulado propio (FastAPI).** El PDF pide usar un servicio simulado con datos ficticios, y además el portal real tiene una verificación anti-bot que un RPA no debería saltarse. Por eso el cliente depende de una interfaz (`AntecedentesClient`): si algún día hay un canal oficial autorizado, se cambia el adaptador sin tocar el resto. El simulador falla a propósito con ciertas cédulas para poder demostrar los reintentos.
- **Módulos separados:** `reader`, `validator`, `client` y `report`, más un `pipeline` que los coordina y una `cli`. Cada uno se prueba por separado.
- **Reintentos con espera exponencial y jitter.** Solo se reintenta lo que tiene sentido (timeouts, errores 5xx, 429). Un 404 se reporta como "no encontrado" y un 400 no se reintenta. Si una consulta falla, se registra como `error` y el proceso sigue.
- **Cédulas inválidas en el reporte.** No se consultan, pero aparecen con estado `error` y el motivo, para que quien entregó el Excel sepa qué corregir.
- **Log con la cédula enmascarada** (`10******81`), porque es un dato personal. Se puede desactivar con `RPA_ENMASCARAR_LOGS=false`.
- **openpyxl en vez de pandas**, porque solo necesitaba leer una columna y escribir un reporte; es más liviano.

## Calidad y entrega

- Las pruebas corren **dentro del build de Docker**: si alguna falla, la imagen no se construye.
- Todo se levanta con `docker compose up`: migraciones, datos de prueba, API, interfaz y una ejecución del RPA.

## Lo que mejoraría con más tiempo

Límite de intentos en el login, refresh tokens, `lock_timeout` en las transacciones, pruebas e2e del backend, un índice único sin distinguir mayúsculas para los nombres de categoría y mensajes de validación del backend en español.
