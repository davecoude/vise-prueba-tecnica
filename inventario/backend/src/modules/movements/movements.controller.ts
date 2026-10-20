import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import {
  ApiErrorResponses,
  ApiProtected,
} from '../../common/swagger/api-docs.decorators';
import { CreateMovementDto } from './dto/create-movement.dto';
import { KardexResponseDto } from './dto/kardex-response.dto';
import { Movement } from './entities/movement.entity';
import type { KardexResult } from './interfaces/kardex.interfaces';
import { MovementsService } from './movements.service';

/** Los movimientos son un sub-recurso del producto: /products/:productId/... */
@ApiTags('movements')
@ApiProtected()
@Controller('products/:productId')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post('movements')
  @ApiOperation({
    summary: 'Registra una entrada o salida de inventario',
    description:
      'Transacción con lock pesimista sobre el producto. Una salida que deje el stock negativo responde 409.',
  })
  @ApiCreatedResponse({ type: Movement })
  @ApiErrorResponses(400, 404, 409)
  register(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateMovementDto,
  ): Promise<Movement> {
    return this.movementsService.register(productId, dto);
  }

  @Get('kardex')
  @ApiOperation({
    summary:
      'Kardex del producto: historial de movimientos con saldo acumulado',
  })
  @ApiOkResponse({ type: KardexResponseDto })
  @ApiErrorResponses(400, 404)
  getKardex(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() query: PaginationQueryDto,
  ): Promise<KardexResult> {
    return this.movementsService.getKardex(productId, query);
  }
}
