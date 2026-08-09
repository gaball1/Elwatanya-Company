import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ISupplierRepository } from '../../domain/supplier.repository';
import { SupplierResult } from '../dto/supplier.dto';
import { toResult } from './list-suppliers.use-case';

export class GetSupplierUseCase {
  constructor(private readonly suppliers: ISupplierRepository) {}

  async execute(id: string): Promise<Result<SupplierResult | null>> {
    const supplier = await this.suppliers.findById(new UniqueEntityId(id));
    if (!supplier) return Result.ok(null);
    return Result.ok(toResult(supplier));
  }
}
