import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { APPROVAL_REPOSITORY } from './domain/approval.repository';
import { IApprovalRepository } from './domain/approval.repository';
import { PrismaApprovalRepository } from './infrastructure/prisma-approval.repository';
import { ListApprovalsUseCase } from './application/use-cases/list-approvals.use-case';
import { RequestApprovalUseCase } from './application/use-cases/request-approval.use-case';
import { ApproveApprovalUseCase } from './application/use-cases/approve-approval.use-case';
import { RejectApprovalUseCase } from './application/use-cases/reject-approval.use-case';
import { SubmitApprovalUseCase } from './application/use-cases/submit-approval.use-case';
import { CancelApprovalUseCase } from './application/use-cases/cancel-approval.use-case';
import { ApprovalController } from './approval.controller';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { ApprovalEntitySyncSubscriber } from './application/approval-entity-sync.subscriber';
import { PrismaService } from '@/prisma/prisma.service';
import { PurchaseModule } from '@/modules/purchase/purchase.module';
import { PurchaseStockService } from '@/modules/purchase/application/purchase-stock.service';
import { AuditService } from '@/modules/audit/audit.service';

@Module({
  imports: [PrismaModule, PurchaseModule],
  controllers: [ApprovalController],
  providers: [
    { provide: APPROVAL_REPOSITORY, useClass: PrismaApprovalRepository },
    {
      provide: ListApprovalsUseCase,
      useFactory: (repo: IApprovalRepository) => new ListApprovalsUseCase(repo),
      inject: [APPROVAL_REPOSITORY],
    },
    {
      provide: RequestApprovalUseCase,
      useFactory: (repo: IApprovalRepository, eventBus: EventBusImpl) => new RequestApprovalUseCase(repo, eventBus),
      inject: [APPROVAL_REPOSITORY, EventBusImpl],
    },
    {
      provide: ApproveApprovalUseCase,
      useFactory: (repo: IApprovalRepository, eventBus: EventBusImpl, audit: AuditService) => new ApproveApprovalUseCase(repo, eventBus, audit),
      inject: [APPROVAL_REPOSITORY, EventBusImpl, AuditService],
    },
    {
      provide: RejectApprovalUseCase,
      useFactory: (repo: IApprovalRepository, eventBus: EventBusImpl, audit: AuditService) => new RejectApprovalUseCase(repo, eventBus, audit),
      inject: [APPROVAL_REPOSITORY, EventBusImpl, AuditService],
    },
    {
      provide: SubmitApprovalUseCase,
      useFactory: (repo: IApprovalRepository, eventBus: EventBusImpl) => new SubmitApprovalUseCase(repo, eventBus),
      inject: [APPROVAL_REPOSITORY, EventBusImpl],
    },
    {
      provide: CancelApprovalUseCase,
      useFactory: (repo: IApprovalRepository, eventBus: EventBusImpl) => new CancelApprovalUseCase(repo, eventBus),
      inject: [APPROVAL_REPOSITORY, EventBusImpl],
    },
    {
      provide: ApprovalEntitySyncSubscriber,
      useFactory: (eventBus: EventBusImpl, prisma: PrismaService, stockService: PurchaseStockService) =>
        new ApprovalEntitySyncSubscriber(eventBus, prisma, stockService),
      inject: [EventBusImpl, PrismaService, PurchaseStockService],
    },
  ],
  exports: [APPROVAL_REPOSITORY],
})
export class ApprovalModule {}
