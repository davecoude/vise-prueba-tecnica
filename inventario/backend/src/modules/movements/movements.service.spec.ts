import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { Movement, MovementType } from './entities/movement.entity';
import { MovementsService } from './movements.service';

/**
 * Pruebas unitarias: aíslan el servicio de la BD con test doubles.
 * - dataSource.transaction ejecuta el callback con un EntityManager simulado.
 * - Se verifica la lógica (saldo, validación, lock solicitado, orden de escrituras),
 *   no el comportamiento de PostgreSQL (eso lo cubre la prueba de concurrencia).
 */
describe('MovementsService', () => {
  let service: MovementsService;

  const manager = {
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const dataSource = { transaction: jest.fn() };
  const movementsRepository = { findAndCount: jest.fn() };
  const productsService = { findOne: jest.fn() };

  const buildProduct = (stock: number): Product =>
    Object.assign(new Product(), {
      id: 1,
      sku: 'ELEC-001',
      name: 'Mouse inalámbrico',
      categoryId: 1,
      price: 45000,
      stock,
    });

  beforeEach(async () => {
    jest.resetAllMocks();

    // La transacción simplemente ejecuta el trabajo con el manager simulado
    dataSource.transaction.mockImplementation(
      (work: (m: typeof manager) => Promise<unknown>) => work(manager),
    );
    manager.create.mockImplementation(
      (_entity: unknown, data: Partial<Movement>) =>
        Object.assign(new Movement(), data),
    );
    manager.save.mockImplementation((movement: Movement) =>
      Promise.resolve(
        Object.assign(movement, {
          id: 100,
          date: new Date('2026-10-19T12:00:00Z'),
        }),
      ),
    );
    manager.update.mockResolvedValue({ affected: 1 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        MovementsService,
        { provide: DataSource, useValue: dataSource },
        {
          provide: getRepositoryToken(Movement),
          useValue: movementsRepository,
        },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = moduleRef.get(MovementsService);
  });

  describe('register', () => {
    it('solicita un lock pesimista (SELECT ... FOR UPDATE) sobre el producto', async () => {
      manager.findOne.mockResolvedValue(buildProduct(10));

      await service.register(1, { type: MovementType.ENTRADA, quantity: 1 });

      expect(manager.findOne).toHaveBeenCalledWith(Product, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('ejecuta lectura y escrituras dentro de una única transacción', async () => {
      manager.findOne.mockResolvedValue(buildProduct(10));

      await service.register(1, { type: MovementType.ENTRADA, quantity: 1 });

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('ENTRADA: suma al stock y registra el saldo resultante', async () => {
      manager.findOne.mockResolvedValue(buildProduct(10));

      const result = await service.register(1, {
        type: MovementType.ENTRADA,
        quantity: 5,
        note: 'Compra a proveedor',
      });

      expect(manager.update).toHaveBeenCalledWith(
        Product,
        { id: 1 },
        { stock: 15 },
      );
      expect(result).toMatchObject({
        id: 100,
        productId: 1,
        type: MovementType.ENTRADA,
        quantity: 5,
        balanceAfter: 15,
        note: 'Compra a proveedor',
      });
    });

    it('SALIDA: resta del stock y registra el saldo resultante', async () => {
      manager.findOne.mockResolvedValue(buildProduct(10));

      const result = await service.register(1, {
        type: MovementType.SALIDA,
        quantity: 4,
      });

      expect(manager.update).toHaveBeenCalledWith(
        Product,
        { id: 1 },
        { stock: 6 },
      );
      expect(result.balanceAfter).toBe(6);
    });

    it('SALIDA que deja el stock exactamente en 0 es válida (caso límite)', async () => {
      manager.findOne.mockResolvedValue(buildProduct(10));

      const result = await service.register(1, {
        type: MovementType.SALIDA,
        quantity: 10,
      });

      expect(manager.update).toHaveBeenCalledWith(
        Product,
        { id: 1 },
        { stock: 0 },
      );
      expect(result.balanceAfter).toBe(0);
    });

    it('SALIDA mayor al stock: lanza 409 y NO escribe nada', async () => {
      manager.findOne.mockResolvedValue(buildProduct(3));

      await expect(
        service.register(1, { type: MovementType.SALIDA, quantity: 5 }),
      ).rejects.toThrow(ConflictException);

      expect(manager.update).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('el mensaje de stock insuficiente informa disponible y solicitado', async () => {
      manager.findOne.mockResolvedValue(buildProduct(3));

      await expect(
        service.register(1, { type: MovementType.SALIDA, quantity: 5 }),
      ).rejects.toThrow('disponible 3, solicitado 5');
    });

    it('SALIDA sobre stock 0: lanza 409', async () => {
      manager.findOne.mockResolvedValue(buildProduct(0));

      await expect(
        service.register(1, { type: MovementType.SALIDA, quantity: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('producto inexistente: lanza 404 y NO escribe nada', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.register(999, { type: MovementType.ENTRADA, quantity: 1 }),
      ).rejects.toThrow(NotFoundException);

      expect(manager.update).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('nota ausente se persiste como null', async () => {
      manager.findOne.mockResolvedValue(buildProduct(10));

      const result = await service.register(1, {
        type: MovementType.ENTRADA,
        quantity: 1,
      });

      expect(result.note).toBeNull();
    });

    it('si falla la actualización del stock, propaga el error y no inserta el movimiento', async () => {
      manager.findOne.mockResolvedValue(buildProduct(10));
      manager.update.mockRejectedValue(new Error('check_violation'));

      await expect(
        service.register(1, { type: MovementType.SALIDA, quantity: 1 }),
      ).rejects.toThrow('check_violation');

      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('getKardex', () => {
    it('producto inexistente: propaga el 404 sin consultar movimientos', async () => {
      productsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.getKardex(999, { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
      expect(movementsRepository.findAndCount).not.toHaveBeenCalled();
    });

    it('consulta en orden de aplicación (id ASC) con la paginación correcta', async () => {
      productsService.findOne.mockResolvedValue(buildProduct(7));
      movementsRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getKardex(1, { page: 3, limit: 5 });

      expect(movementsRepository.findAndCount).toHaveBeenCalledWith({
        where: { productId: 1 },
        order: { id: 'ASC' },
        skip: 10,
        take: 5,
      });
    });

    it('devuelve resumen del producto, movimientos con saldo y metadatos de paginación', async () => {
      const movements = [
        Object.assign(new Movement(), {
          id: 1,
          type: MovementType.ENTRADA,
          quantity: 10,
          balanceAfter: 10,
        }),
        Object.assign(new Movement(), {
          id: 2,
          type: MovementType.SALIDA,
          quantity: 3,
          balanceAfter: 7,
        }),
      ];
      productsService.findOne.mockResolvedValue(buildProduct(7));
      movementsRepository.findAndCount.mockResolvedValue([movements, 12]);

      const result = await service.getKardex(1, { page: 1, limit: 2 });

      expect(result.product).toEqual({
        id: 1,
        sku: 'ELEC-001',
        name: 'Mouse inalámbrico',
        currentStock: 7,
      });
      expect(result.data).toBe(movements);
      expect(result.meta).toEqual({
        page: 1,
        limit: 2,
        total: 12,
        totalPages: 6,
      });
    });
  });
});
