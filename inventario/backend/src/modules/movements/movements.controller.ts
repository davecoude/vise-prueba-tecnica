import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { Movement } from './entities/movement.entity';
import type { KardexResult } from './interfaces/kardex.interfaces';
import { MovementsService } from './movements.service';

/** Los movimientos son un sub-recurso del producto: /products/:productId/... */
@Controller('products/:productId')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post('movements')
  register(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateMovementDto,
  ): Promise<Movement> {
    return this.movementsService.register(productId, dto);
  }

  @Get('kardex')
  getKardex(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() query: PaginationQueryDto,
  ): Promise<KardexResult> {
    return this.movementsService.getKardex(productId, query);
  }
}
