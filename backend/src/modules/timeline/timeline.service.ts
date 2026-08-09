import { Injectable, Inject } from '@nestjs/common';
import { TIMELINE_REPOSITORY, ITimelineRepository, TimelineFilter } from './domain/timeline.repository';
import { TimelineEvent } from './domain/timeline-event.entity';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

@Injectable()
export class TimelineService {
  constructor(
    @Inject(TIMELINE_REPOSITORY)
    private readonly repository: ITimelineRepository,
  ) {}

  async record(entityType: string, entityId: string, eventName: string, eventCategory = 'general', options?: {
    description?: string;
    metadata?: Record<string, any>;
    causedByEventId?: string;
    triggeredById?: string;
  }): Promise<void> {
    const event = TimelineEvent.create({
      entityType,
      entityId,
      eventName,
      eventCategory,
      description: options?.description,
      metadata: options?.metadata,
      causedByEventId: options?.causedByEventId,
      triggeredById: options?.triggeredById,
    });
    await this.repository.save(event);
  }

  async getTimeline(entityType: string, entityId: string, filter?: TimelineFilter) {
    return this.repository.findByEntity(entityType, entityId, filter);
  }

  async getTimelineByType(entityType: string, filter?: TimelineFilter) {
    return this.repository.findByEntityType(entityType, filter);
  }

  async getEntityLifecycle(entityType: string, entityId: string): Promise<{
    created?: TimelineEvent;
    statusChanges: TimelineEvent[];
    keyEvents: TimelineEvent[];
    completed?: TimelineEvent;
  }> {
    const all = await this.repository.findByEntity(entityType, entityId, { limit: 100 });
    return {
      created: all.find((e) => e.eventName === 'Created'),
      statusChanges: all.filter((e) => e.eventCategory === 'status'),
      keyEvents: all.filter((e) => e.eventCategory !== 'status'),
      completed: all.find((e) => e.eventName === 'Completed'),
    };
  }
}
