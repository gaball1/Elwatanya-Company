import { DomainException } from '../../common/exceptions/domain.exception';

export class ConcurrencyException extends DomainException {
  constructor(message: string = 'Concurrency conflict') {
    super(message, /* HttpStatus.CONFLICT */ 409);
  }
}
