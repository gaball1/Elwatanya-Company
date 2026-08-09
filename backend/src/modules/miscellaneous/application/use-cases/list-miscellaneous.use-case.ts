import { Result } from '@/shared/kernel/result';
import { Miscellaneous } from '../../domain/miscellaneous.entity';
import { MiscellaneousResult } from '../dto/miscellaneous.dto';

export function toResult(m: Miscellaneous): MiscellaneousResult {
  return {
    id: m.id.toValue(),
    projectId: m.projectId,
    description: m.description,
    amount: m.amount,
    category: m.category,
    date: m.date,
    notes: m.notes,
    createdBy: m.createdBy,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

export class ListMiscellaneousUseCase {
  constructor(private readonly miscellaneous: import('../../domain/miscellaneous.repository').IMiscellaneousRepository) {}

  async execute(): Promise<Result<MiscellaneousResult[]>> {
    const list = await this.miscellaneous.findAll();
    return Result.ok(list.map(toResult));
  }
}
