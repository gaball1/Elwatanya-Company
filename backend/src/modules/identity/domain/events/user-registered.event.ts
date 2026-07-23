import { DomainEvent } from '@/shared/kernel/domain-event';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export class UserRegisteredEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventName = 'UserRegistered';

  constructor(
    public readonly userId: UniqueEntityId,
    public readonly email: string,
  ) {
    this.occurredOn = new Date();
  }
}
