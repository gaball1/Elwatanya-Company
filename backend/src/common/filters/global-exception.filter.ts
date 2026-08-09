import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../response/api-response';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ReturnType<typeof ApiResponse.error>;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message = exception.message;
      let errors: any[] | undefined;

      if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(resp.message)) {
          message = 'Validation failed';
          errors = resp.message as string[];
        } else if (typeof resp.message === 'string') {
          message = resp.message;
        }
      }

      switch (status) {
        case HttpStatus.BAD_REQUEST:
          body = errors ? ApiResponse.validation(errors) : ApiResponse.error('BAD_REQUEST', message);
          break;
        case HttpStatus.UNAUTHORIZED:
          body = ApiResponse.unauthorized(message);
          break;
        case HttpStatus.FORBIDDEN:
          body = ApiResponse.forbidden(message);
          break;
        case HttpStatus.NOT_FOUND:
          body = ApiResponse.notFound(message);
          break;
        case HttpStatus.CONFLICT:
          body = ApiResponse.conflict(message);
          break;
        default:
          body = ApiResponse.error('ERROR', message);
      }
    } else if (exception instanceof Error) {
      body = ApiResponse.internal(
        process.env.NODE_ENV === 'production' ? 'Internal server error' : exception.message,
      );
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
    } else {
      body = ApiResponse.internal('Internal server error');
    }

    response.status(status).json(body);
  }
}
