import { Result } from '@/shared/kernel/result';
import { IMiscellaneousRepository } from '../../domain/miscellaneous.repository';
import { CreateMiscellaneousInput, MiscellaneousResult } from '../dto/miscellaneous.dto';
import { Miscellaneous } from '../../domain/miscellaneous.entity';
import { toResult } from './list-miscellaneous.use-case';
import { FinancialService } from '@/common/services/financial.service';
import { PrismaService } from '@/prisma/prisma.service';

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
      createdBy: input.createdBy,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const miscellaneous = result.getValue();

    try {
      await this.prisma.$transaction(async (tx) => {
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
