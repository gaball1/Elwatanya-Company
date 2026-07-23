import { Result } from '@/shared/kernel/result';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { User } from '../../domain/user.entity';
import { IUserRepository } from '../../domain/user.repository';
import { IPasswordHasher } from '../ports/password-hasher.port';
import { IDomainEventPublisher } from '../ports/domain-event-publisher.port';
import { RegisterUserInput } from '../dto/register-user.input';
import {
  IdentityApplicationError,
  IdentityErrorCode,
} from '../errors/identity-application.error';

export interface RegisterUserResult {
  id: string;
  email: string;
  name: string;
  role: string;
  projectId: string | null;
}

export class RegisterUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly eventPublisher: IDomainEventPublisher,
  ) {}

  async execute(input: RegisterUserInput): Promise<Result<RegisterUserResult>> {
    const emailResult = Email.create(input.email);
    if (emailResult.isFailure) {
      return Result.fail(
        new IdentityApplicationError(IdentityErrorCode.INVALID_EMAIL, 'Invalid email address'),
      );
    }

    const passwordResult = Password.create(input.password);
    if (passwordResult.isFailure) {
      return Result.fail(
        new IdentityApplicationError(
          IdentityErrorCode.INVALID_PASSWORD,
          passwordResult.error?.message ?? 'Invalid password',
        ),
      );
    }

    const email = emailResult.getValue();
    if (await this.users.existsByEmail(email)) {
      return Result.fail(
        new IdentityApplicationError(
          IdentityErrorCode.EMAIL_ALREADY_REGISTERED,
          'Email already registered',
        ),
      );
    }

    const passwordHash = await this.passwordHasher.hash(passwordResult.getValue());
    const userResult = User.register({
      email,
      name: input.name,
      passwordHash,
    });

    if (userResult.isFailure) {
      return Result.fail(
        new IdentityApplicationError(
          IdentityErrorCode.INVALID_NAME,
          userResult.error?.message ?? 'Unable to register user',
        ),
      );
    }

    const user = userResult.getValue();
    await this.users.save(user);
    await this.eventPublisher.publish(user.pullDomainEvents());

    return Result.ok({
      id: user.id.toValue(),
      email: user.email.value,
      name: user.name,
      role: user.role,
      projectId: user.projectId,
    });
  }
}
