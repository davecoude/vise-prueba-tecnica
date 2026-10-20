import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';

// campos que expone el driver `pg` en sus errores
interface PgDriverError extends Error {
  code?: string;
  constraint?: string;
}

/// mensajes de negocio para constraints con nombre semantico (definidos en las entidades)
const CONSTRAINT_MESSAGES: Record<string, string> = {
  UQ_products_sku: 'Ya existe un producto con ese SKU',
  CHK_products_stock_non_negative:
    'Stock insuficiente: la operación dejaría el stock en negativo',
  CHK_movements_balance_non_negative:
    'Stock insuficiente: la operación dejaría el stock en negativo',
};

/**
 * Traduce errores de PostgreSQL a respuestas HTTP coherentes.
 * Es la red de seguridad para races que las validaciones del servicio no pueden cubrir.
 * Nunca expone el SQL ni el detalle del driver al cliente.
 */
@Catch(QueryFailedError)
export class QueryFailedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedExceptionFilter.name);

  catch(exception: QueryFailedError<PgDriverError>, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(exception.driverError);

    // getResponse() conserva el formato estandar de Nest: { statusCode, message, error }
    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(error: PgDriverError): HttpException {
    const knownMessage = error.constraint
      ? CONSTRAINT_MESSAGES[error.constraint]
      : undefined;

    switch (error.code) {
      case '23505': // unique_violation
        return new ConflictException(
          knownMessage ?? 'Ya existe un registro con ese valor único',
        );
      case '23503': // foreign_key_violation
        return new ConflictException(
          knownMessage ??
            'El registro está referenciado por otros datos (p. ej. movimientos) y no puede eliminarse',
        );
      case '23514': // check_violation
        return new ConflictException(
          knownMessage ?? 'La operación viola una regla de integridad',
        );
      case '22P02': // invalid_text_representation
      case '22003': // numeric_value_out_of_range
        return new BadRequestException('Valor de entrada inválido');
      default:
        this.logger.error(
          `Error de BD no controlado [${error.code}]: ${error.message}`,
          error.stack,
        );
        return new InternalServerErrorException('Error interno del servidor');
    }
  }
}
