import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { PaginatedResult } from '../../common/pagination/paginated-result';
import {
  ApiErrorResponses,
  ApiProtected,
} from '../../common/swagger/api-docs.decorators';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { LowStockQueryDto } from './dto/low-stock-query.dto';
import {
  LowStockResponseDto,
  PaginatedProductsResponseDto,
} from './dto/product-responses.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import type { LowStockResult } from './products.service';

@ApiTags('products')
@ApiProtected()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Crea un producto (stock inicial 0; el stock entra por movimientos)',
  })
  @ApiCreatedResponse({ type: Product })
  @ApiErrorResponses(400, 404, 409)
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista productos con paginación, filtro por categoría y búsqueda',
  })
  @ApiOkResponse({ type: PaginatedProductsResponseDto })
  @ApiErrorResponses(400)
  findAll(
    @Query() query: ListProductsQueryDto,
  ): Promise<PaginatedResult<Product>> {
    return this.productsService.findAll(query);
  }

  // Debe declararse ANTES de ':id'; si no, "low-stock" se interpreta como un id
  @Get('low-stock')
  @ApiOperation({ summary: 'Productos con stock por debajo de un umbral' })
  @ApiOkResponse({ type: LowStockResponseDto })
  @ApiErrorResponses(400)
  findLowStock(
    @Query() { threshold }: LowStockQueryDto,
  ): Promise<LowStockResult> {
    return this.productsService.findLowStock(threshold);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un producto por id' })
  @ApiOkResponse({ type: Product })
  @ApiErrorResponses(400, 404)
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualiza parcialmente un producto (el stock no es editable)',
  })
  @ApiOkResponse({ type: Product })
  @ApiErrorResponses(400, 404, 409)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un producto sin movimientos registrados' })
  @ApiNoContentResponse({ description: 'Producto eliminado' })
  @ApiErrorResponses(400, 404, 409)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productsService.remove(id);
  }
}
