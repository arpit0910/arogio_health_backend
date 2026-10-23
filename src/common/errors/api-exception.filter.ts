import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiError } from './api-error';

interface ValidationExceptionBody {
  code?: string;
  message?: string;
  details?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { id?: string }>();
    const response = context.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof ApiError) {
      ({ status, code, message, details } = exception);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const parsed = body as ValidationExceptionBody;
        code = parsed.code ?? `HTTP_${status}`;
        message = parsed.message ?? exception.message;
        details = parsed.details;
      } else {
        message = String(body);
        code = `HTTP_${status}`;
      }
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
        requestId: request.id ?? response.getHeader('x-request-id') ?? 'unknown',
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
      },
    });
  }
}
