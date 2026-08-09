import { Result } from '@/shared/kernel/result';
import { Supplier } from '../../domain/supplier.entity';
import { SupplierResult } from '../dto/supplier.dto';
import { ISupplierRepository } from '../../domain/supplier.repository';

export function toResult(s: Supplier): SupplierResult {
  return {
    id: s.id.toValue(),
    name: s.name,
    contactPerson: s.contactPerson,
    phone: s.phone,
    email: s.email,
    address: s.address,
    products: s.products,
    paymentTerms: s.paymentTerms,
    joinDate: s.joinDate,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export class ListSuppliersUseCase {
  constructor(private readonly suppliers: ISupplierRepository) {}

  async execute(): Promise<Result<SupplierResult[]>> {
    const list = await this.suppliers.findAll();
    return Result.ok(list.map(toResult));
  }
}
