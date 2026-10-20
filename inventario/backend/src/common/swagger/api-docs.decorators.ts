import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

type ErrorStatus = 400 | 401 | 404 | 409 | 503;

const ERROR_DESCRIPTIONS: Record<ErrorStatus, string> = {
  400: 'Datos de entrada inválidos',
  401: 'Token ausente, inválido o expirado',
  404: 'Recurso no encontrado',
  409: 'Conflicto con el estado actual (duplicado, stock insuficiente o registro referenciado)',
  503: 'Servicio no disponible',
};

/** Documenta varias respuestas de error con el esquema estándar, sin repetir decoradores. */
export const ApiErrorResponses = (...statuses: ErrorStatus[]) =>
  applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: ERROR_DESCRIPTIONS[status],
        type: ErrorResponseDto,
      }),
    ),
  );

/** Marca un controller/endpoint como protegido por JWT en la documentación. */
export const ApiProtected = () =>
  applyDecorators(ApiBearerAuth(), ApiErrorResponses(401));
