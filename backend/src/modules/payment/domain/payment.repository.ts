import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Payment } from './payment.entity';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface IPaymentRepository {
  save(payment: Payment): Promise<void>;
  findByBuildingAndContractor(
    buildingId: UniqueEntityId,
    contractorId: UniqueEntityId,
  ): Promise<Payment[]>;
}
