import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DomainEvent } from './domain/event-bus.interface';
import { IEventStore } from './domain/event-store.interface';

@Injectable()
export class EventStoreService implements IEventStore {
  constructor(private readonly prisma: PrismaService) {}

  async append(event: DomainEvent): Promise<void> {
    await this.prisma.eventStoreRecord.create({
      data: {
        eventName: event.eventName,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.payload as any,
        occurredOn: event.occurredOn,
        correlationId: event.correlationId,
        metadata: (event.metadata ?? {}) as any,
      },
    });
  }

  async appendMany(events: DomainEvent[]): Promise<void> {
    await this.prisma.eventStoreRecord.createMany({
      data: events.map((e) => ({
        eventName: e.eventName,
        aggregateId: e.aggregateId,
        aggregateType: e.aggregateType,
        payload: e.payload as any,
        occurredOn: e.occurredOn,
        correlationId: e.correlationId,
        metadata: (e.metadata ?? {}) as any,
      })),
    });
  }

  async getEventsByAggregate(aggregateId: string): Promise<DomainEvent[]> {
    const records = await this.prisma.eventStoreRecord.findMany({
      where: { aggregateId },
      orderBy: { occurredOn: 'asc' },
    });
    return records.map(this.toDomain);
  }

  async getEventsByName(eventName: string, limit = 100): Promise<DomainEvent[]> {
    const records = await this.prisma.eventStoreRecord.findMany({
      where: { eventName },
      orderBy: { occurredOn: 'desc' },
      take: limit,
    });
    return records.map(this.toDomain);
  }

  async getEventsSince(since: Date, limit = 100): Promise<DomainEvent[]> {
    const records = await this.prisma.eventStoreRecord.findMany({
      where: { occurredOn: { gte: since } },
      orderBy: { occurredOn: 'asc' },
      take: limit,
    });
    return records.map(this.toDomain);
  }

  private toDomain(record: any): DomainEvent {
    return {
      eventName: record.eventName,
      aggregateId: record.aggregateId,
      aggregateType: record.aggregateType,
      payload: record.payload as Record<string, any>,
      occurredOn: record.occurredOn,
      correlationId: record.correlationId ?? undefined,
      metadata: record.metadata as Record<string, any> | undefined,
    };
  }
}
