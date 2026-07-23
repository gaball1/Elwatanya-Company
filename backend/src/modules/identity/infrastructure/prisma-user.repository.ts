import { Injectable } from '@nestjs/common';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IUserRepository } from '../domain/user.repository';
import { User } from '../domain/user.entity';
import { Email } from '../domain/value-objects/email.vo';
import { PasswordHash } from '../domain/value-objects/password-hash.vo';
import { UserRole } from '../domain/user-role.enum';
import { UserStatus } from '../domain/user-status.enum';
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    const data = {
      email: user.email.value,
      name: user.name,
      passwordHash: user.passwordHash.value,
      role: user.role as PrismaUserRole,
      status: user.status,
      projectId: user.projectId,
      deletedAt: user.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.user.upsert({
      where: { id: user.id.toValue() },
      create: {
        id: user.id.toValue(),
        ...data,
        createdAt: user.createdAt,
      },
      update: data,
    });
  }

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { email: email.value, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.value, deletedAt: null },
    });
    return count > 0;
  }

  private toDomain(record: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    role: PrismaUserRole;
    status: string;
    projectId: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    const email = Email.create(record.email).getValue();
    const passwordHash = PasswordHash.create(record.passwordHash).getValue();
    const status = Object.values(UserStatus).includes(record.status as UserStatus)
      ? (record.status as UserStatus)
      : UserStatus.ACTIVE;

    return User.reconstitute(
      {
        email,
        name: record.name,
        passwordHash,
        role: record.role as UserRole,
        status,
        projectId: record.projectId,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
