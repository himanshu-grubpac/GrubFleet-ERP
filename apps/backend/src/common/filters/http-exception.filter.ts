import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
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
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        message = this.stringifyField(obj.message, message);
        code = this.stringifyField(obj.code, this.codeFromStatus(statusCode));
        details = obj.details;
      } else {
        code = this.codeFromStatus(statusCode);
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        { err: exception.message, correlationId },
        exception.stack,
      );
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
