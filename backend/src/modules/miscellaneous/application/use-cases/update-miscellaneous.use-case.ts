import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IMiscellaneousRepository } from '../../domain/miscellaneous.repository';
import { UpdateMiscellaneousInput, MiscellaneousResult } from '../dto/miscellaneous.dto';
import { toResult } from './list-miscellaneous.use-case';
import { FinancialService } from '@/common/services/financial.service';
import { PrismaService } from '@/prisma/prisma.service';

export class UpdateMiscellaneousUseCase {
  constructor(
    private readonly miscellaneous: IMiscellaneousRepository,
    private readonly financialService: FinancialService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateMiscellaneousInput): Promise<Result<MiscellaneousResult>> {
    const miscellaneous = await this.miscellaneous.findById(new UniqueEntityId(input.id));
    if (!miscellaneous) return Result.fail(new Error('Miscellaneous record not found'));

    const oldAmount = miscellaneous.amount;

    const updateResult = miscellaneous.update({
      description: input.description,
      amount: input.amount,
      category: input.category,
      date: input.date,
      notes: input.notes,
      invoiceFile: input.invoiceFile,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    const newAmount = miscellaneous.amount;
    const diff = newAmount - oldAmount;

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.miscellaneous.save(miscellaneous, tx);
        if (diff !== 0) {
          if (diff > 0) {
            await this.financialService.recordExpense({
              projectId: miscellaneous.projectId,
              amount: diff,
              category: 'miscellaneous',
              referenceId: miscellaneous.id.toValue(),
              description: `تعديل مصروف نثريات: ${miscellaneous.description} (زيادة ${diff.toFixed(2)})`,
              createdBy: input.createdBy ?? 'system',
              date: new Date(),
            }, tx);
          } else {
            await this.financialService.reverseExpense({
              projectId: miscellaneous.projectId,
              amount: Math.abs(diff),
              category: 'miscellaneous',
              referenceId: miscellaneous.id.toValue(),
              description: `تعديل مصروف نثريات: ${miscellaneous.description} (نقص ${Math.abs(diff).toFixed(2)})`,
              createdBy: input.createdBy ?? 'system',
            }, tx);
          }
        }
      });
    } catch (error: any) {
      return Result.fail(error);
    }

    return Result.ok(toResult(miscellaneous));
  }
}
