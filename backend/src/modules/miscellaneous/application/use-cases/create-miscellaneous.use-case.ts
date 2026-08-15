import { Result } from '@/shared/kernel/result';
import { IMiscellaneousRepository } from '../../domain/miscellaneous.repository';
import { CreateMiscellaneousInput, MiscellaneousResult } from '../dto/miscellaneous.dto';
import { Miscellaneous } from '../../domain/miscellaneous.entity';
import { toResult } from './list-miscellaneous.use-case';
import { FinancialService } from '@/common/services/financial.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export class CreateMiscellaneousUseCase {
  constructor(
    private readonly miscellaneous: IMiscellaneousRepository,
    private readonly financialService: FinancialService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateMiscellaneousInput): Promise<Result<MiscellaneousResult>> {
    const result = Miscellaneous.create({
      projectId: input.projectId,
      description: input.description,
      amount: input.amount,
      category: input.category,
      date: input.date,
      notes: input.notes,
      invoiceFile: input.invoiceFile,
      createdBy: input.createdBy,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const miscellaneous = result.getValue();

    try {
      await this.prisma.$transaction(async (tx) => {
        const fund = await tx.projectFund.findFirst({
          where: { projectId: input.projectId, deletedAt: null },
        });
        if (!fund) {
          throw new Error('لا توجد عهدة لهذا المشروع. برجاء إنشاء عهدة أولاً');
        }
        if (new Prisma.Decimal(miscellaneous.amount).gt(fund.pettyCashBalance)) {
          throw new Error(
            `رصيد عهدة الموقع غير كافٍ. المتاح: ${Number(fund.pettyCashBalance).toLocaleString('en-EG')}، المطلوب: ${miscellaneous.amount.toLocaleString('en-EG')}`,
          );
        }

        await this.miscellaneous.save(miscellaneous, tx);
        await this.financialService.recordExpense({
          projectId: input.projectId,
          amount: input.amount,
          category: 'miscellaneous',
          referenceId: miscellaneous.id.toValue(),
          description: `مصروف نثريات: ${input.description}`,
          createdBy: input.createdBy ?? 'system',
          date: input.date,
        }, tx);
      });
    } catch (error: any) {
      return Result.fail(error);
    }

    return Result.ok(toResult(miscellaneous));
  }
}
