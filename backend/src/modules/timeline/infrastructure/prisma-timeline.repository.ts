import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ITimelineRepository, TimelineFilter } from '../domain/timeline.repository';
import { TimelineEvent } from '../domain/timeline-event.entity';

@Injectable()
export class PrismaTimelineRepository implements ITimelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(event: TimelineEvent): Promise<void> {
    await this.prisma.timelineEvent.create({
      data: {
        id: event.id.toValue(),
        entityType: event.entityType,
        entityId: event.entityId,
        eventName: event.eventName,
        eventCategory: event.eventCategory,
        description: event.description ?? null,
        metadata: (event.metadata ?? {}) as any,
        occurredAt: event.occurredAt,
        causedByEventId: event.causedByEventId ?? null,
        triggeredById: event.triggeredById ?? null,
      },
    });
  }

  async findByEntity(entityType: string, entityId: string, filter?: TimelineFilter): Promise<TimelineEvent[]> {
    const records = await this.prisma.timelineEvent.findMany({
      where: {
        entityType,
        entityId,
        eventCategory: filter?.eventCategory,
        occurredAt: {
          gte: filter?.from,
          lte: filter?.to,
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByEntityType(entityType: string, filter?: TimelineFilter): Promise<TimelineEvent[]> {
    const records = await this.prisma.timelineEvent.findMany({
      where: {
        entityType,
        eventCategory: filter?.eventCategory,
        occurredAt: {
          gte: filter?.from,
          lte: filter?.to,
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: any): TimelineEvent {
    return TimelineEvent.create(
      {
        entityType: record.entityType,
        entityId: record.entityId,
        eventName: record.eventName,
        eventCategory: record.eventCategory,
        description: record.description ?? undefined,
        metadata: record.metadata as Record<string, any> | undefined,
        causedByEventId: record.causedByEventId ?? undefined,
        triggeredById: record.triggeredById ?? undefined,
      },
      record.occurredAt,
      new UniqueEntityId(record.id),
    );
  }
}
