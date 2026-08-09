import { TimelineEvent } from './timeline-event.entity';

export const TIMELINE_REPOSITORY = Symbol('TIMELINE_REPOSITORY');

export interface TimelineFilter {
  entityType?: string;
  entityId?: string;
  eventCategory?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface ITimelineRepository {
  save(event: TimelineEvent): Promise<void>;
  findByEntity(entityType: string, entityId: string, filter?: TimelineFilter): Promise<TimelineEvent[]>;
  findByEntityType(entityType: string, filter?: TimelineFilter): Promise<TimelineEvent[]>;
}
