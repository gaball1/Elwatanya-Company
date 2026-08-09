import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ROLE_REPOSITORY } from './domain/role.repository';
import { IRoleRepository } from './domain/role.repository';
import { PrismaRoleRepository } from './infrastructure/prisma-role.repository';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { UpdateRoleUseCase } from './application/use-cases/update-role.use-case';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case';
import { RoleController } from './role.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RoleController],
  providers: [
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: ListRolesUseCase, useFactory: (repo: IRoleRepository) => new ListRolesUseCase(repo), inject: [ROLE_REPOSITORY] },
    { provide: CreateRoleUseCase, useFactory: (repo: IRoleRepository) => new CreateRoleUseCase(repo), inject: [ROLE_REPOSITORY] },
    { provide: UpdateRoleUseCase, useFactory: (repo: IRoleRepository) => new UpdateRoleUseCase(repo), inject: [ROLE_REPOSITORY] },
    { provide: DeleteRoleUseCase, useFactory: (repo: IRoleRepository) => new DeleteRoleUseCase(repo), inject: [ROLE_REPOSITORY] },
  ],
  exports: [ROLE_REPOSITORY],
})
export class RoleModule {}
