import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { EMPLOYEE_REPOSITORY } from './domain/employee.repository';
import { IEmployeeRepository } from './domain/employee.repository';
import { PrismaEmployeeRepository } from './infrastructure/prisma-employee.repository';
import { ListEmployeesUseCase } from './application/use-cases/list-employees.use-case';
import { GetEmployeeUseCase } from './application/use-cases/get-employee.use-case';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.use-case';
import { UpdateEmployeeUseCase } from './application/use-cases/update-employee.use-case';
import { DeleteEmployeeUseCase } from './application/use-cases/delete-employee.use-case';
import { EmployeeController } from './employee.controller';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeeController],
  providers: [
    { provide: EMPLOYEE_REPOSITORY, useClass: PrismaEmployeeRepository },
    {
      provide: ListEmployeesUseCase,
      useFactory: (repo: IEmployeeRepository) => new ListEmployeesUseCase(repo),
      inject: [EMPLOYEE_REPOSITORY],
    },
    {
      provide: GetEmployeeUseCase,
      useFactory: (repo: IEmployeeRepository) => new GetEmployeeUseCase(repo),
      inject: [EMPLOYEE_REPOSITORY],
    },
    {
      provide: CreateEmployeeUseCase,
      useFactory: (repo: IEmployeeRepository, eventBus: EventBusImpl) =>
        new CreateEmployeeUseCase(repo, eventBus),
      inject: [EMPLOYEE_REPOSITORY, EventBusImpl],
    },
    {
      provide: UpdateEmployeeUseCase,
      useFactory: (repo: IEmployeeRepository) => new UpdateEmployeeUseCase(repo),
      inject: [EMPLOYEE_REPOSITORY],
    },
    {
      provide: DeleteEmployeeUseCase,
      useFactory: (repo: IEmployeeRepository) => new DeleteEmployeeUseCase(repo),
      inject: [EMPLOYEE_REPOSITORY],
    },
  ],
  exports: [EMPLOYEE_REPOSITORY],
})
export class EmployeeModule {}
