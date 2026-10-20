import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { escapeLike } from '../../common/utils/sql.util';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }

  // reutilizado por ProductsService para validar la FK con un 404 claro
  async findOne(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy({ id });
    if (!category) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return category;
  }

  async create({ name }: CreateCategoryDto): Promise<Category> {
    // comparacion case-insensitive: "Aseo" y "aseo" son la misma categoría
    if (
      await this.categoriesRepository.existsBy({
        name: ILike(escapeLike(name)),
      })
    ) {
      throw new ConflictException(`Ya existe la categoría "${name}"`);
    }
    return this.categoriesRepository.save(
      this.categoriesRepository.create({ name }),
    );
  }
}
