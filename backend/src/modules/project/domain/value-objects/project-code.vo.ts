import { ValueObject } from '@/shared/kernel/value-object';
import { Result } from '@/shared/kernel/result';

interface ProjectCodeProps {
  value: string;
}

export class ProjectCode extends ValueObject<ProjectCodeProps> {
  private static readonly MAX_LENGTH = 50;
  private static readonly PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

  get value(): string {
    return this.props.value;
  }

  private constructor(props: ProjectCodeProps) {
    super(props);
  }

  public static create(code: string): Result<ProjectCode> {
    if (!code || code.trim().length === 0) {
      return Result.fail(new Error('Project code is required'));
    }

    const normalized = code.trim().toUpperCase();

    if (normalized.length > ProjectCode.MAX_LENGTH) {
      return Result.fail(new Error(`Project code must be at most ${ProjectCode.MAX_LENGTH} characters`));
    }

    if (!ProjectCode.PATTERN.test(normalized)) {
      return Result.fail(
        new Error('Project code must start with alphanumeric and contain only letters, numbers, hyphens, or underscores'),
      );
    }

    return Result.ok(new ProjectCode({ value: normalized }));
  }
}
