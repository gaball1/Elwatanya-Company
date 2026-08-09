import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Holiday } from '../domain/holiday.entity';
import { IHolidayRepository } from '../domain/holiday.repository';

@Injectable()
export class PrismaHolidayRepository implements IHolidayRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(holiday: Holiday): Promise<void> {
    const data = {
      name: holiday.name,
      date: holiday.date,
      description: holiday.description,
      isRecurring: holiday.isRecurring,
      deletedAt: holiday.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.holiday.upsert({
      where: { id: holiday.id.toValue() },
      create: {
        id: holiday.id.toValue(),
        ...data,
        createdAt: holiday.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Holiday | null> {
    const record = await this.prisma.holiday.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Holiday[]> {
    const records = await this.prisma.holiday.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    name: string;
    date: Date;
    description: string;
    isRecurring: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Holiday {
    return Holiday.reconstitute(
      {
        name: record.name,
        date: record.date,
        description: record.description,
        isRecurring: record.isRecurring,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
