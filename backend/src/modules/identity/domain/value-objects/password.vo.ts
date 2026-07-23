import { ValueObject } from '@/shared/kernel/value-object';
import { Result } from '@/shared/kernel/result';

interface PasswordProps {
  value: string;
}

export class Password extends ValueObject<PasswordProps> {
  private static readonly MIN_LENGTH = 8;

  get value(): string {
    return this.props.value;
  }

  private constructor(props: PasswordProps) {
    super(props);
  }

  public static create(password: string): Result<Password> {
    if (!password || password.length < Password.MIN_LENGTH) {
      return Result.fail(new Error(`Password must be at least ${Password.MIN_LENGTH} characters`));
    }
    return Result.ok(new Password({ value: password }));
  }
}
