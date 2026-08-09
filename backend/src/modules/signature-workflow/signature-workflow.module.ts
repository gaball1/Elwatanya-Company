import { Module } from '@nestjs/common';
import { SignatureWorkflowController } from './signature-workflow.controller';
import { SignatureWorkflowService } from './application/signature-workflow.service';
import { SignatureWorkflowRepository } from './infrastructure/signature-workflow.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SignatureWorkflowController],
  providers: [SignatureWorkflowService, SignatureWorkflowRepository],
  exports: [SignatureWorkflowService],
})
export class SignatureWorkflowModule {}
