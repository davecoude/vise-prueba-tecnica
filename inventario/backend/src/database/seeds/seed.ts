import dataSource from '../data-source';
import { hashPassword } from '../../common/security/password.util';
import { Category } from '../../modules/categories/entities/category.entity';
import { Movement, MovementType } from '../../modules/movements/entities/movement.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { User } from '../../modules/users/entities/user.entity';

const CATEGORIES = ['Electrónica', 'Papelería', 'Aseo', 'Ferretería'];

// algunos productos quedan intencionalmente bajo el umbral de 10 para probar ese endpoint
const PRODUCTS = [
  { sku: 'ELEC-001', name: 'Mouse inalámbrico', category: 'Electrónica', price: 45000, stock: 25 },
  { sku: 'ELEC-002', name: 'Teclado mecánico', category: 'Electrónica', price: 189900, stock: 8 },
  { sku: 'ELEC-003', name: 'Cable HDMI 2m', category: 'Electrónica', price: 18500, stock: 60 },
  { sku: 'PAP-001', name: 'Resma papel carta', category: 'Papelería', price: 21900, stock: 40 },
  { sku: 'PAP-002', name: 'Caja de bolígrafos x12', category: 'Papelería', price: 14000, stock: 3 },
  { sku: 'ASE-001', name: 'Gel antibacterial 1L', category: 'Aseo', price: 16500, stock: 12 },
  { sku: 'ASE-002', name: 'Toallas de papel x6', category: 'Aseo', price: 23900, stock: 0 },
  { sku: 'FER-001', name: 'Juego de destornilladores', category: 'Ferretería', price: 54900, stock: 5 },
];

async function run(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) {
    throw new Error('SEED_USER_EMAIL y SEED_USER_PASSWORD son obligatorios');
  }

  await dataSource.initialize();
  try {
    // todo o nada: si algo falla, no queda un seed a medias
    await dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const categories = manager.getRepository(Category);
      const products = manager.getRepository(Product);
      const movements = manager.getRepository(Movement);

      // 1. Usuario de prueba
      if (!(await users.existsBy({ email }))) {
        await users.insert({ email, passwordHash: await hashPassword(password) });
        console.log(`✔ Usuario creado: ${email}`);
      }

      // 2. Categorías
      await categories.upsert(CATEGORIES.map((name) => ({ name })), ['name']);
      const categoryIdByName = new Map(
        (await categories.find()).map((c) => [c.name, c.id]),
      );

      // 3. Productos + movimiento inicial.
      // El stock inicial se registra como ENTRADA para que kardex y stock cuadren desde el dia 1.
      for (const p of PRODUCTS) {
        if (await products.existsBy({ sku: p.sku })) continue;

        const categoryId = categoryIdByName.get(p.category);
        if (!categoryId) throw new Error(`Categoría no encontrada: ${p.category}`);

        const product = await products.save(
          products.create({ sku: p.sku, name: p.name, price: p.price, stock: p.stock, categoryId }),
        );

        if (p.stock > 0) {
          await movements.insert({
            productId: product.id,
            type: MovementType.ENTRADA,
            quantity: p.stock,
            balanceAfter: p.stock,
            note: 'Inventario inicial (seed)',
          });
        }
        console.log(`✔ Producto creado: ${p.sku}`);
      }
    });
    console.log('Seed completado.');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error: unknown) => {
  console.error('✖ Error en el seed:', error);
  process.exit(1);
});