import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IMiscellaneousRepository } from '../../domain/miscellaneous.repository';
import { FinancialService } from '@/common/services/financial.service';
import { PrismaService } from '@/prisma/prisma.service';

export class DeleteMiscellaneousUseCase {
  constructor(
    private readonly miscellaneous: IMiscellaneousRepository,
    private readonly financialService: FinancialService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: string): Promise<Result<void>> {
    const miscellaneous = await this.miscellaneous.findById(new UniqueEntityId(id));
    if (!miscellaneous) return Result.fail(new Error('Miscellaneous record not found'));

    const deleteResult = miscellaneous.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.miscellaneous.save(miscellaneous, tx);
        await this.financialService.reverseExpense({
          projectId: miscellaneous.projectId,
          amount: miscellaneous.amount,
          category: 'miscellaneous',
          referenceId: miscellaneous.id.toValue(),
          description: `عكس مصروف نثريات: ${miscellaneous.description}`,
          createdBy: 'system',
        }, tx);
      });
    } catch (error: any) {
      return Result.fail(error);
    }

    return Result.ok();
  }
}
