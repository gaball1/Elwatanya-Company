import { BaseEntity } from './base-entity';
import { DomainEvent } from './domain-event';
import { UniqueEntityId } from './unique-entity-id.vo';

export abstract class AggregateRoot extends BaseEntity {
  private _domainEvents: DomainEvent[] = [];

  constructor(id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this.clearDomainEvents();
    return events;
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
