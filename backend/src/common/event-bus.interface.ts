// src/common/event-bus.interface.ts
export interface DomainEvent {
  /** name of the event, e.g. 'DistributionApproved' */
  readonly name: string;
  /** payload specific to the event */
  readonly payload: any;
}

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
}
