import { ValueObject } from '@/shared/kernel/value-object';
import { Result } from '@/shared/kernel/result';

interface PasswordProps {
  value: string;
}

export class Password extends ValueObject<PasswordProps> {
  private static readonly MIN_LENGTH = 12;
  private static readonly COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

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
    if (!Password.COMPLEXITY.test(password)) {
      return Result.fail(
        new Error('Password must include uppercase, lowercase, a number and a special character'),
      );
    }
    return Result.ok(new Password({ value: password }));
  }
}
