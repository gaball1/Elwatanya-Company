import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export function handleError(error: Error | string | undefined | null, defaultMessage: string): never {
  const msg = typeof error === 'string' ? error : error?.message ?? defaultMessage;
  if (msg.includes('already exists')) {
    throw new ConflictException(msg);
  }
  if (msg.includes('not found') || msg.includes('NotFound')) {
    throw new NotFoundException(msg);
  }
  throw new BadRequestException(msg);
}
