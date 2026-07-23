import { Result } from '@/shared/kernel/result';
import { Email } from '../../domain/value-objects/email.vo';
import { IUserRepository } from '../../domain/user.repository';
import { IPasswordHasher } from '../ports/password-hasher.port';
import { AuthenticateUserInput } from '../dto/authenticate-user.input';
import {
  IdentityApplicationError,
  IdentityErrorCode,
} from '../errors/identity-application.error';

export interface AuthenticatedUserResult {
  id: string;
  email: string;
  name: string;
  role: string;
  projectId: string | null;
}

export class AuthenticateUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<Result<AuthenticatedUserResult>> {
    const emailResult = Email.create(input.email);
    if (emailResult.isFailure) {
      return Result.fail(
        new IdentityApplicationError(
          IdentityErrorCode.INVALID_CREDENTIALS,
          'Invalid credentials',
        ),
      );
    }

    const user = await this.users.findByEmail(emailResult.getValue());
    if (!user) {
      return Result.fail(
        new IdentityApplicationError(
          IdentityErrorCode.INVALID_CREDENTIALS,
          'Invalid credentials',
        ),
      );
    }

    const valid = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!valid) {
      return Result.fail(
        new IdentityApplicationError(
          IdentityErrorCode.INVALID_CREDENTIALS,
          'Invalid credentials',
        ),
      );
    }

    if (!user.isActive) {
      return Result.fail(
        new IdentityApplicationError(
          IdentityErrorCode.ACCOUNT_NOT_ACTIVE,
          'Account is not active',
        ),
      );
    }

    return Result.ok({
      id: user.id.toValue(),
      email: user.email.value,
      name: user.name,
      role: user.role,
      projectId: user.projectId,
    });
  }
}
