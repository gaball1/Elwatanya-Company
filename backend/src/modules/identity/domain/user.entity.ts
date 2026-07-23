import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Email } from './value-objects/email.vo';
import { PasswordHash } from './value-objects/password-hash.vo';
import { UserRole } from './user-role.enum';
import { UserStatus } from './user-status.enum';
import { UserRegisteredEvent } from './events/user-registered.event';

export interface UserProps {
  email: Email;
  name: string;
  passwordHash: PasswordHash;
  role: UserRole;
  status: UserStatus;
  projectId: string | null;
  deletedAt: Date | null;
}

export class User extends AggregateRoot {
  private props: UserProps;

  private constructor(
    props: UserProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get email(): Email {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get passwordHash(): PasswordHash {
    return this.props.passwordHash;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get projectId(): string | null {
    return this.props.projectId;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isActive(): boolean {
    return this.props.status === UserStatus.ACTIVE && this.props.deletedAt === null;
  }

  public static register(input: {
    email: Email;
    name: string;
    passwordHash: PasswordHash;
    role?: UserRole;
    projectId?: string | null;
  }): Result<User> {
    const nameGuard = Guard.againstNullOrUndefined(input.name?.trim(), 'name');
    if (nameGuard.isFailure) {
      return Result.fail(nameGuard.error as Error);
    }

    const trimmedName = input.name.trim();
    if (trimmedName.length === 0) {
      return Result.fail(new Error('Name cannot be empty'));
    }

    const user = new User({
      email: input.email,
      name: trimmedName,
      passwordHash: input.passwordHash,
      role: input.role ?? UserRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
      projectId: input.projectId ?? null,
      deletedAt: null,
    });

    user.addDomainEvent(new UserRegisteredEvent(user.id, user.email.value));
    return Result.ok(user);
  }

  public static reconstitute(
    props: UserProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): User {
    return new User(props, id, createdAt, updatedAt);
  }
}
