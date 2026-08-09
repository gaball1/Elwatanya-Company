import { Result } from '@/shared/kernel/result';
import { ISubcontractorRepository } from '../../domain/subcontractor.repository';
import { CreateSubcontractorInput, SubcontractorResult } from '../dto/subcontractor.dto';
import { Subcontractor } from '../../domain/subcontractor.entity';
import { toResult } from './list-subcontractors.use-case';
import { NotificationService } from '@/common/services/notification.service';

export class CreateSubcontractorUseCase {
  constructor(
    private readonly subcontractors: ISubcontractorRepository,
    private readonly notifications: NotificationService,
  ) {}

  async execute(input: CreateSubcontractorInput): Promise<Result<SubcontractorResult>> {
    const result = Subcontractor.create({
      name: input.name,
      workType: input.workType,
      marginType: input.marginType,
      marginValue: input.marginValue,
      phone: input.phone,
      email: input.email,
      address: input.address,
      joinDate: input.joinDate,
      status: input.status,
    });

    if (result.isFailure) {
      return Result.fail(result.error as Error);
    }

    const sub = result.getValue();
    await this.subcontractors.save(sub);
    await this.notifications.createForAllUsers({
      title: 'تم إضافة مقاول جديد',
      titleEn: 'New Subcontractor Added',
      message: `تمت إضافة المقاول ${sub.name}`,
      messageEn: `Subcontractor ${sub.name} was added`,
      type: 'info',
      entityType: 'subcontractor',
      entityId: sub.id.toValue(),
      link: '/subcontractors',
    });
    return Result.ok(toResult(sub));
  }
}
