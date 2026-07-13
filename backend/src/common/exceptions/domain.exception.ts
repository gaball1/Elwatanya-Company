// src/common/exceptions/domain.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for all domain‑level exceptions.
 * It carries an HTTP status so the global exception filter can map it
 * to the appropriate response code.
 */
export class DomainException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class NotFoundException extends DomainException {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictException extends DomainException {
  constructor(message = 'Conflict') {
    super(message, HttpStatus.CONFLICT);
  }
}

export class ValidationException extends DomainException {
  constructor(message = 'Validation failed') {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
