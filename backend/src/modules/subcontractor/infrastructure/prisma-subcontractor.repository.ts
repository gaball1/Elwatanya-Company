import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Subcontractor } from '../domain/subcontractor.entity';
import { ISubcontractorRepository } from '../domain/subcontractor.repository';

@Injectable()
export class PrismaSubcontractorRepository implements ISubcontractorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(subcontractor: Subcontractor): Promise<void> {
    const data = {
      name: subcontractor.name,
      workType: subcontractor.workType,
      marginType: subcontractor.marginType,
      marginValue: subcontractor.marginValue,
      phone: subcontractor.phone,
      email: subcontractor.email,
      address: subcontractor.address,
      joinDate: subcontractor.joinDate,
      status: subcontractor.status,
      deletedAt: subcontractor.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.subcontractor.upsert({
      where: { id: subcontractor.id.toValue() },
      create: {
        id: subcontractor.id.toValue(),
        ...data,
        createdAt: subcontractor.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Subcontractor | null> {
    const record = await this.prisma.subcontractor.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Subcontractor[]> {
    const records = await this.prisma.subcontractor.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await this.prisma.subcontractor.update({
      where: { id: id.toValue() },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  private toDomain(record: {
    id: string;
    name: string;
    workType: string;
    marginType: string;
    marginValue: any;
    phone: string;
    email: string;
    address: string;
    joinDate: Date | null;
    status: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Subcontractor {
    return Subcontractor.reconstitute(
      {
        name: record.name,
        workType: record.workType,
        marginType: record.marginType,
        marginValue: Number(record.marginValue),
        phone: record.phone,
        email: record.email,
        address: record.address,
        joinDate: record.joinDate,
        status: record.status,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
