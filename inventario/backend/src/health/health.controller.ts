import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { ApiErrorResponses } from '../common/swagger/api-docs.decorators';
import { Public } from '../modules/auth/decorators/public.decorator';
import { HealthStatusDto } from './dto/health-status.dto';

/**
 * Liveness + readiness: lo usa el healthcheck de Docker Compose para que
 * el frontend no arranque hasta que la API y la BD estén listas.
 */
@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({
    summary: 'Estado de la API y de la conexión a la base de datos',
  })
  @ApiOkResponse({ type: HealthStatusDto })
  @ApiErrorResponses(503)
  async check(): Promise<HealthStatusDto> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Base de datos no disponible');
    }
    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
