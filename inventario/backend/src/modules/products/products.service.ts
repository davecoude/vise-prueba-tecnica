import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, LessThan, Repository } from 'typeorm';
import { paginate } from '../../common/pagination/paginated-result';
import type { PaginatedResult } from '../../common/pagination/paginated-result';
import { escapeLike } from '../../common/utils/sql.util';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

/** Columnas editables por el CRUD. `stock` queda fuera a propósito. */
type ProductChanges = Partial<Pick<Product, 'name' | 'sku' | 'categoryId' | 'price'>>;

export interface LowStockResult {
  threshold: number;
  total: number;
  data: Product[];
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly categoriesService: CategoriesService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    await this.categoriesService.findOne(dto.categoryId); // 404 si no existe
    await this.assertSkuAvailable(dto.sku); // 409 si ya existe

    // todo producto nace en 0; el stock entra por movimientos de tipo ENTRADA
    const { id } = await this.productsRepository.save(
      this.productsRepository.create({
        name: dto.name,
        sku: dto.sku,
        categoryId: dto.categoryId,
        price: dto.price,
        stock: 0,
      }),
    );
    return this.findOne(id);
  }

  async findAll({ page, limit, categoryId, search }: ListProductsQueryDto): Promise<PaginatedResult<Product>> {
    const base: FindOptionsWhere<Product> = categoryId ? { categoryId } : {};
    // Un arreglo en `where` se traduce a OR: (name ILIKE x OR sku ILIKE x) AND category
    const where = search
      ? [
          { ...base, name: ILike(`%${escapeLike(search)}%`) },
          { ...base, sku: ILike(`%${escapeLike(search)}%`) },
        ]
      : base;

    const [data, total] = await this.productsRepository.findAndCount({
      where,
      relations: { category: true },
      order: { id: 'ASC' }, // orden determinista: la paginacion no repite ni omite filas
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(data, total, page, limit);
  }

  async findLowStock(threshold?: number): Promise<LowStockResult> {
    const effectiveThreshold =
      threshold ?? this.config.getOrThrow<number>('LOW_STOCK_DEFAULT_THRESHOLD');

    const data = await this.productsRepository.find({
      where: { stock: LessThan(effectiveThreshold) },
      relations: { category: true },
      order: { stock: 'ASC', id: 'ASC' }, // los mas críticos primero
    });
    return { threshold: effectiveThreshold, total: data.length, data };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { category: true },
    });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    const changes = this.toProductChanges(dto);
    if (Object.keys(changes).length === 0) return product; // nada que actualizar

    if (dto.categoryId !== undefined && dto.categoryId !== product.categoryId) {
      await this.categoriesService.findOne(dto.categoryId);
    }
    if (dto.sku !== undefined && dto.sku !== product.sku) {
      await this.assertSkuAvailable(dto.sku);
    }

    // update() parcial (no save()): solo escribe las columnas del DTO
    // Nunca toca `stock` → no pisa cambios concurrentes de un movimiento (lost update)
    await this.productsRepository.update(id, changes);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    // si tiene movimientos, la FK RESTRICT falla → el filtro global responde 409
    await this.productsRepository.delete(id);
  }

  /**
   * Mapeo explícito DTO → columnas (allowlist): solo estos campos pueden escribirse.
   * Omite los `undefined` para que update() no intente escribir columnas ausentes.
   */
  private toProductChanges(dto: UpdateProductDto): ProductChanges {
    const candidate: ProductChanges = {
      name: dto.name,
      sku: dto.sku,
      categoryId: dto.categoryId,
      price: dto.price,
    };
    return Object.fromEntries(
      Object.entries(candidate).filter(([, value]) => value !== undefined),
    ) as ProductChanges;
  }

  private async assertSkuAvailable(sku: string): Promise<void> {
    if (await this.productsRepository.existsBy({ sku })) {
      throw new ConflictException(`Ya existe un producto con el SKU ${sku}`);
    }
  }
}