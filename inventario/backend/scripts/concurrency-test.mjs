/**
 * Prueba de concurrencia del kardex contra la API real.
 *
 * Crea un producto de prueba con stock inicial S y dispara N salidas EN PARALELO.
 * Si el control de concurrencia funciona:
 *   - Exactamente floor(S / qty) salidas responden 201 y el resto 409.
 *   - El stock final nunca es negativo y coincide con el último saldo del kardex.
 *   - La cadena de saldos del kardex es consistente movimiento a movimiento.
 *
 * Uso:   node scripts/concurrency-test.mjs [solicitudes=20] [stockInicial=10] [cantidad=1]
 * Env:   API_URL, SEED_USER_EMAIL, SEED_USER_PASSWORD (opcionales)
 */
const API = process.env.API_URL ?? 'http://localhost:3000/api';
const EMAIL = process.env.SEED_USER_EMAIL ?? 'admin@vise.com';
const PASSWORD = process.env.SEED_USER_PASSWORD ?? 'Admin123*';

const REQUESTS = Number(process.argv[2] ?? 20);
const INITIAL_STOCK = Number(process.argv[3] ?? 10);
const QUANTITY = Number(process.argv[4] ?? 1);

async function http(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

function expectStatus(result, expected, step) {
  if (result.status !== expected) {
    throw new Error(
      `${step}: se esperaba HTTP ${expected} y llegó ${result.status} → ${JSON.stringify(result.data)}`,
    );
  }
  return result.data;
}

async function main() {
  console.log(
    `API: ${API} | solicitudes: ${REQUESTS} | stock inicial: ${INITIAL_STOCK} | cantidad: ${QUANTITY}\n`,
  );

  // 1. Autenticación y datos de prueba
  const { accessToken: token } = expectStatus(
    await http('/auth/login', {
      method: 'POST',
      body: { email: EMAIL, password: PASSWORD },
    }),
    200,
    'Login',
  );
  const [category] = expectStatus(
    await http('/categories', { token }),
    200,
    'Categorías',
  );
  const product = expectStatus(
    await http('/products', {
      method: 'POST',
      token,
      body: {
        name: 'Producto prueba concurrencia',
        sku: `CONC-${Date.now()}`,
        categoryId: category.id,
        price: 1000,
      },
    }),
    201,
    'Crear producto',
  );
  expectStatus(
    await http(`/products/${product.id}/movements`, {
      method: 'POST',
      token,
      body: {
        type: 'entrada',
        quantity: INITIAL_STOCK,
        note: 'Stock inicial prueba concurrencia',
      },
    }),
    201,
    'Entrada inicial',
  );
  console.log(
    `Producto ${product.sku} (id ${product.id}) creado con stock ${INITIAL_STOCK}`,
  );

  // 2. Disparo en paralelo: todas las solicitudes compiten por la misma fila
  const started = Date.now();
  const results = await Promise.all(
    Array.from({ length: REQUESTS }, (_, i) =>
      http(`/products/${product.id}/movements`, {
        method: 'POST',
        token,
        body: {
          type: 'salida',
          quantity: QUANTITY,
          note: `Salida concurrente #${i + 1}`,
        },
      }),
    ),
  );
  const elapsed = Date.now() - started;

  const count = (status) => results.filter((r) => r.status === status).length;
  const created = count(201);
  const conflicts = count(409);
  const others = results.filter((r) => r.status !== 201 && r.status !== 409);

  // 3. Estado final
  const finalProduct = expectStatus(
    await http(`/products/${product.id}`, { token }),
    200,
    'Producto final',
  );
  const kardex = expectStatus(
    await http(`/products/${product.id}/kardex?limit=100`, { token }),
    200,
    'Kardex',
  );

  let runningBalance = 0;
  const brokenChain = kardex.data.filter((m) => {
    runningBalance += m.type === 'entrada' ? m.quantity : -m.quantity;
    return m.balanceAfter !== runningBalance;
  });
  const lastBalance = kardex.data.at(-1)?.balanceAfter;

  const expectedCreated = Math.min(
    REQUESTS,
    Math.floor(INITIAL_STOCK / QUANTITY),
  );
  const expectedStock = INITIAL_STOCK - expectedCreated * QUANTITY;

  // 4. Verificaciones
  const checks = [
    [
      `Salidas aceptadas (201) = ${expectedCreated}`,
      created === expectedCreated,
      created,
    ],
    [
      `Salidas rechazadas (409) = ${REQUESTS - expectedCreated}`,
      conflicts === REQUESTS - expectedCreated,
      conflicts,
    ],
    [
      'Sin respuestas inesperadas (500, etc.)',
      others.length === 0,
      others.map((r) => r.status).join(',') || 0,
    ],
    [
      `Stock final = ${expectedStock}`,
      finalProduct.stock === expectedStock,
      finalProduct.stock,
    ],
    ['Stock final nunca negativo', finalProduct.stock >= 0, finalProduct.stock],
    [
      'Último saldo del kardex = stock del producto',
      lastBalance === finalProduct.stock,
      lastBalance,
    ],
    [
      `Movimientos en kardex = ${expectedCreated + 1}`,
      kardex.meta.total === expectedCreated + 1,
      kardex.meta.total,
    ],
    [
      'Cadena de saldos consistente',
      brokenChain.length === 0,
      `${brokenChain.length} rotos`,
    ],
  ];

  console.log(
    `\n${REQUESTS} solicitudes concurrentes resueltas en ${elapsed} ms\n`,
  );
  for (const [label, ok, actual] of checks) {
    console.log(`${ok ? '✔ PASS' : '✖ FAIL'}  ${label}  (obtenido: ${actual})`);
  }

  const failed = checks.filter(([, ok]) => !ok).length;
  console.log(
    failed === 0
      ? '\nRESULTADO: OK — stock consistente bajo concurrencia'
      : `\nRESULTADO: ${failed} verificación(es) fallida(s)`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('✖ Error ejecutando la prueba:', error.message);
  process.exit(1);
});
