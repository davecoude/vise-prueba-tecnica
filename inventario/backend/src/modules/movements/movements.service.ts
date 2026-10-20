import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { paginate } from '../../common/pagination/paginated-result';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { calculateBalanceAfter } from './domain/stock-balance';
import { CreateMovementDto } from './dto/create-movement.dto';
import { Movement } from './entities/movement.entity';
import type { KardexResult } from './interfaces/kardex.interfaces';

@Injectable()
export class MovementsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Movement)
    private readonly movementsRepository: Repository<Movement>,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * Registra una entrada o salida de forma atómica y segura ante concurrencia.
   *
   * 1. Abre una transacción.
   * 2. SELECT ... FOR UPDATE sobre el producto: las demás transacciones que quieran
   *    mover ESTE producto esperan hasta el COMMIT/ROLLBACK (se serializan).
   * 3. Calcula el saldo con el stock ya bloqueado (nunca con un valor obsoleto).
   * 4. Rechaza (409) si el saldo quedaría negativo; el throw provoca ROLLBACK.
   * 5. Actualiza el stock e inserta el movimiento con su saldo en la misma transacción.
   *
   * Además, el CHECK (stock >= 0) de la BD actúa como última barrera.
   */
  register(productId: number, dto: CreateMovementDto): Promise<Movement> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product)
        throw new NotFoundException(`Producto ${productId} no encontrado`);

      const balanceAfter = calculateBalanceAfter(
        product.stock,
        dto.type,
        dto.quantity,
      );
      if (balanceAfter < 0) {
        throw new ConflictException(
          `Stock insuficiente para ${product.sku}: disponible ${product.stock}, solicitado ${dto.quantity}`,
        );
      }

      await manager.update(Product, { id: productId }, { stock: balanceAfter });

      return manager.save(
        manager.create(Movement, {
          productId,
          type: dto.type,
          quantity: dto.quantity,
          balanceAfter,
          note: dto.note ?? null,
        }),
      );
    });
  }

  /**
   * Kardex: historial cronológico con saldo acumulado.
   * Se ordena por id porque el id se asigna en el INSERT, que ocurre mientras se
   * mantiene el lock del producto → refleja el orden real en que se aplicaron los movimientos.
   */
  async getKardex(
    productId: number,
    { page, limit }: PaginationQueryDto,
  ): Promise<KardexResult> {
    const product = await this.productsService.findOne(productId); // 404 si no existe

    const [data, total] = await this.movementsRepository.findAndCount({
      where: { productId },
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        currentStock: product.stock,
      },
      ...paginate(data, total, page, limit),
    };
  }
}
