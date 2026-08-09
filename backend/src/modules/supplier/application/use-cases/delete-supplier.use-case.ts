import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ISupplierRepository } from '../../domain/supplier.repository';

export class DeleteSupplierUseCase {
  constructor(private readonly suppliers: ISupplierRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const supplier = await this.suppliers.findById(new UniqueEntityId(id));
    if (!supplier) return Result.fail(new Error('Supplier not found'));

    const deleteResult = supplier.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.suppliers.save(supplier);
    return Result.ok();
  }
}
