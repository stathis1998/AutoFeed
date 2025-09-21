import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface PostgresError extends Error {
  code: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const error = exception as unknown as PostgresError;
    const { status, message } = this.mapDatabaseError(error);

    // Log the error for debugging (with full details)
    this.logger.error(`Database error: ${error.code} - ${error.message}`, {
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column,
      url: request.url,
      method: request.method,
    });

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    response.status(status).json(errorResponse);
  }

  private mapDatabaseError(error: PostgresError): {
    status: HttpStatus;
    message: string;
  } {
    const code = error.code;

    switch (code) {
      // Unique constraint violation
      case '23505':
        return {
          status: HttpStatus.CONFLICT,
          message: this.getUniqueConstraintMessage(error),
        };

      // Foreign key constraint violation
      case '23503':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to related resource',
        };

      // Not null constraint violation
      case '23502':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required field cannot be empty',
        };

      // Check constraint violation
      case '23514':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid data format or value',
        };

      // Serialization failure
      case '40001':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Database conflict occurred, please retry',
        };

      // Deadlock detected
      case '40P01':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database temporarily unavailable, please retry',
        };

      // Invalid text representation (e.g., invalid UUID format)
      case '22P02':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid data format',
        };

      // Numeric value out of range
      case '22003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Value out of acceptable range',
        };

      // String data too long
      case '22001':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Data too long for field',
        };

      // Connection failure
      case '08006':
      case '08000':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database connection failed',
        };

      // Default case for unhandled database errors
      default:
        this.logger.warn(`Unhandled database error code: ${code}`);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An unexpected database error occurred',
        };
    }
  }

  private getUniqueConstraintMessage(error: PostgresError): string {
    // Try to extract a more user-friendly message from constraint name
    const constraint = error.constraint?.toLowerCase() || '';
    const detail = error.detail || '';

    if (constraint.includes('email') || detail.includes('email')) {
      return 'Email address is already registered';
    }

    if (constraint.includes('username') || detail.includes('username')) {
      return 'Username is already taken';
    }

    if (constraint.includes('phone') || detail.includes('phone')) {
      return 'Phone number is already registered';
    }

    // Generic message for other unique constraints
    return 'This value already exists and must be unique';
  }
}
