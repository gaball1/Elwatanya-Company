import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { DEPARTMENT_REPOSITORY } from './domain/department.repository';
import { IDepartmentRepository } from './domain/department.repository';
import { PrismaDepartmentRepository } from './infrastructure/prisma-department.repository';
import { ListDepartmentsUseCase } from './application/use-cases/list-departments.use-case';
import { CreateDepartmentUseCase } from './application/use-cases/create-department.use-case';
import { UpdateDepartmentUseCase } from './application/use-cases/update-department.use-case';
import { DeleteDepartmentUseCase } from './application/use-cases/delete-department.use-case';
import { DepartmentController } from './department.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DepartmentController],
  providers: [
    { provide: DEPARTMENT_REPOSITORY, useClass: PrismaDepartmentRepository },
    {
      provide: ListDepartmentsUseCase,
      useFactory: (repo: IDepartmentRepository) => new ListDepartmentsUseCase(repo),
      inject: [DEPARTMENT_REPOSITORY],
    },
    {
      provide: CreateDepartmentUseCase,
      useFactory: (repo: IDepartmentRepository) => new CreateDepartmentUseCase(repo),
      inject: [DEPARTMENT_REPOSITORY],
    },
    {
      provide: UpdateDepartmentUseCase,
      useFactory: (repo: IDepartmentRepository) => new UpdateDepartmentUseCase(repo),
      inject: [DEPARTMENT_REPOSITORY],
    },
    {
      provide: DeleteDepartmentUseCase,
      useFactory: (repo: IDepartmentRepository) => new DeleteDepartmentUseCase(repo),
      inject: [DEPARTMENT_REPOSITORY],
    },
  ],
  exports: [DEPARTMENT_REPOSITORY],
})
export class DepartmentModule {}
