import { ValueObject } from '@/shared/kernel/value-object';
import { Result } from '@/shared/kernel/result';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  get value(): string {
    return this.props.value;
  }

  private constructor(props: EmailProps) {
    super(props);
  }

  public static create(email: string): Result<Email> {
    if (!email || !Email.EMAIL_REGEX.test(email)) {
      return Result.fail(new Error('Invalid email address'));
    }
    return Result.ok(new Email({ value: email.toLowerCase().trim() }));
  }
}
