import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationEventBus } from '@/common/notification-event-bus';
import { USER_REPOSITORY } from './domain/user.repository';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { DOMAIN_EVENT_PUBLISHER } from './application/ports/domain-event-publisher.port';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user.use-case';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';
import { CommonDomainEventPublisher } from './infrastructure/common-domain-event-publisher';

@Module({
  imports: [PrismaModule],
  providers: [
    NotificationEventBus,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: DOMAIN_EVENT_PUBLISHER, useClass: CommonDomainEventPublisher },
    {
      provide: RegisterUserUseCase,
      useFactory: (
        users: PrismaUserRepository,
        passwordHasher: BcryptPasswordHasher,
        eventPublisher: CommonDomainEventPublisher,
      ) => new RegisterUserUseCase(users, passwordHasher, eventPublisher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: AuthenticateUserUseCase,
      useFactory: (users: PrismaUserRepository, passwordHasher: BcryptPasswordHasher) =>
        new AuthenticateUserUseCase(users, passwordHasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
  ],
  exports: [RegisterUserUseCase, AuthenticateUserUseCase],
})
export class IdentityModule {}
