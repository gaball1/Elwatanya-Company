import { ValueObject } from '@/shared/kernel/value-object';
import { Result } from '@/shared/kernel/result';

interface PasswordHashProps {
  value: string;
}

export class PasswordHash extends ValueObject<PasswordHashProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: PasswordHashProps) {
    super(props);
  }

  public static create(hash: string): Result<PasswordHash> {
    if (!hash || hash.trim().length === 0) {
      return Result.fail(new Error('Password hash cannot be empty'));
    }
    return Result.ok(new PasswordHash({ value: hash }));
  }
}
