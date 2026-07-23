import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Subcontractor } from '../domain/subcontractor.entity';
import { ISubcontractorRepository } from '../domain/subcontractor.repository';

@Injectable()
export class PrismaSubcontractorRepository implements ISubcontractorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(subcontractor: Subcontractor): Promise<void> {
    await this.prisma.subcontractor.upsert({
      where: { id: subcontractor.id.toValue() },
      create: {
        id: subcontractor.id.toValue(),
        name: subcontractor.name,
        createdAt: subcontractor.createdAt,
        updatedAt: new Date(),
        deletedAt: subcontractor.deletedAt,
      },
      update: {
        name: subcontractor.name,
        updatedAt: new Date(),
        deletedAt: subcontractor.deletedAt,
      },
    });
  }

  async findById(id: UniqueEntityId): Promise<Subcontractor | null> {
    const record = await this.prisma.subcontractor.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    if (!record) return null;
    return Subcontractor.reconstitute(
      { name: record.name, deletedAt: record.deletedAt },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }

  async findAll(): Promise<Subcontractor[]> {
    const records = await this.prisma.subcontractor.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return records.map((record) =>
      Subcontractor.reconstitute(
        { name: record.name, deletedAt: record.deletedAt },
        new UniqueEntityId(record.id),
        record.createdAt,
        record.updatedAt,
      ),
    );
  }
}
