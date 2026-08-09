import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface TimelineEventProps {
  entityType: string;
  entityId: string;
  eventName: string;
  eventCategory: string;
  description?: string;
  metadata?: Record<string, any>;
  causedByEventId?: string;
  triggeredById?: string;
}

export class TimelineEvent extends AggregateRoot {
  private props: TimelineEventProps;
  public readonly occurredAt: Date;

  private constructor(props: TimelineEventProps, occurredAt?: Date, id?: UniqueEntityId) {
    super(id);
    this.props = props;
    this.occurredAt = occurredAt ?? new Date();
  }

  get entityType(): string { return this.props.entityType; }
  get entityId(): string { return this.props.entityId; }
  get eventName(): string { return this.props.eventName; }
  get eventCategory(): string { return this.props.eventCategory; }
  get description(): string | undefined { return this.props.description; }
  get metadata(): Record<string, any> | undefined { return this.props.metadata; }
  get causedByEventId(): string | undefined { return this.props.causedByEventId; }
  get triggeredById(): string | undefined { return this.props.triggeredById; }

  static create(props: TimelineEventProps, occurredAt?: Date, id?: UniqueEntityId): TimelineEvent {
    return new TimelineEvent(props, occurredAt, id);
  }
}
