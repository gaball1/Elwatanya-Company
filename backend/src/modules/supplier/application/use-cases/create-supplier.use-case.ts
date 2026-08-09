import { Result } from '@/shared/kernel/result';
import { ISupplierRepository } from '../../domain/supplier.repository';
import { CreateSupplierInput, SupplierResult } from '../dto/supplier.dto';
import { Supplier } from '../../domain/supplier.entity';
import { toResult } from './list-suppliers.use-case';
import { NotificationService } from '@/common/services/notification.service';

export class CreateSupplierUseCase {
  constructor(
    private readonly suppliers: ISupplierRepository,
    private readonly notifications: NotificationService,
  ) {}

  async execute(input: CreateSupplierInput): Promise<Result<SupplierResult>> {
    const result = Supplier.create({
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

    if (result.isFailure) return Result.fail(result.error as Error);

    const supplier = result.getValue();
    await this.suppliers.save(supplier);
    await this.notifications.createForAllUsers({
      title: 'تم إضافة مورد جديد',
      titleEn: 'New Supplier Added',
      message: `تمت إضافة المورد ${supplier.name}`,
      messageEn: `Supplier ${supplier.name} was added`,
      type: 'info',
      entityType: 'supplier',
      entityId: supplier.id.toValue(),
      link: '/suppliers',
    });
    return Result.ok(toResult(supplier));
  }
}
