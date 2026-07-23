import { Result } from './result';

export class Guard {
  public static againstNullOrUndefined(value: unknown, argumentName?: string): Result<void> {
    if (value === null || value === undefined) {
      return Result.fail(new Error(`${argumentName ?? 'Value'} is null or undefined`));
    }
    return Result.ok();
  }

  public static combine(...results: Result<any>[]): Result<void> {
    for (const result of results) {
      if (result.isFailure) return Result.fail(result.error as Error);
    }
    return Result.ok();
  }
}
