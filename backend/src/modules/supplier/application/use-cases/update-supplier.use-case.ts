import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ISupplierRepository } from '../../domain/supplier.repository';
import { UpdateSupplierInput, SupplierResult } from '../dto/supplier.dto';
import { toResult } from './list-suppliers.use-case';

export class UpdateSupplierUseCase {
  constructor(private readonly suppliers: ISupplierRepository) {}

  async execute(input: UpdateSupplierInput): Promise<Result<SupplierResult>> {
    const supplier = await this.suppliers.findById(new UniqueEntityId(input.id));
    if (!supplier) return Result.fail(new Error('Supplier not found'));

    const updateResult = supplier.update({
      name: input.name,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email,
      address: input.address,
      products: input.products,
      paymentTerms: input.paymentTerms,
      joinDate: input.joinDate,
      status: input.status,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.suppliers.save(supplier);
    return Result.ok(toResult(supplier));
  }
}
