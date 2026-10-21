import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { buildValidationErrorDetails } from '../http/validation-error.util';
import { mapPostgresErrorToHttp } from '../../infrastructure/database/postgres-error.util';

interface ApiErrorBody {
  message: string;
  code: string;
  statusCode: number;
  correlationId?: string;
  details?: unknown;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      request.correlationId ?? request.headers['x-correlation-id'];

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong';
    let code = 'INTERNAL_ERROR';
    let details: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = this.codeFromStatus(statusCode);
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        const rawMessage = obj.message;

        if (
          Array.isArray(rawMessage) &&
          obj.details === undefined &&
          rawMessage.every((entry) => typeof entry === 'string')
        ) {
          details = buildValidationErrorDetails(rawMessage);
        }

        message = this.stringifyField(rawMessage, message);

        if (typeof obj.code === 'string' && obj.code.length > 0) {
          code = obj.code;
        } else if (
          statusCode === HttpStatus.BAD_REQUEST &&
          Array.isArray(rawMessage)
        ) {
          code = 'VALIDATION_ERROR';
        } else {
          code = this.codeFromStatus(statusCode);
        }

        if (obj.details !== undefined) {
          details = obj.details;
        }
      } else {
        code = this.codeFromStatus(statusCode);
      }
    } else {
      const mapped = mapPostgresErrorToHttp(exception);
      if (mapped) {
        statusCode = mapped.statusCode;
        message = mapped.message;
        code = mapped.code;
      } else if (exception instanceof Error) {
        this.logger.error(
          { err: exception.message, correlationId },
          exception.stack,
        );
      }
    }

    const payload: ApiErrorBody = {
      message,
      code,
      statusCode,
      correlationId:
        typeof correlationId === 'string' ? correlationId : undefined,
    };
    if (details !== undefined) {
      payload.details = details;
    }

    response.status(statusCode).json(payload);
  }

  private stringifyField(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      return value
        .map((v) => this.stringifyField(v, ''))
        .filter(Boolean)
        .join(', ');
    }
    return fallback;
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
    };
    return map[status] ?? 'HTTP_ERROR';
  }
}
