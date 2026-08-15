import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import {
  SubcontractorContract,
  SubcontractorContractProps,
  ContractStatus,
} from '../domain/subcontractor-contract.entity';
import { ISubcontractorContractRepository } from '../domain/subcontractor-contract.repository';

@Injectable()
export class PrismaSubcontractorContractRepository
  implements ISubcontractorContractRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async save(contract: SubcontractorContract): Promise<void> {
    const data = {
      contractNumber: contract.contractNumber,
      buildingId: contract.buildingId,
      subcontractorId: contract.subcontractorId,
      title: contract.title,
      startDate: contract.startDate,
      endDate: contract.endDate,
      totalValue: contract.totalValue,
      terms: contract.terms ?? Prisma.DbNull,
      notes: contract.notes,
      status: contract.status,
      createdBy: contract.createdBy,
      deletedAt: contract.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.subcontractorContract.upsert({
      where: { id: contract.id.toValue() },
      create: {
        id: contract.id.toValue(),
        ...data,
        createdAt: contract.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<SubcontractorContract | null> {
    const record = await this.prisma.subcontractorContract.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByBuildingSubcontractor(
    buildingId: string,
    subcontractorId: string,
  ): Promise<SubcontractorContract[]> {
    const records = await this.prisma.subcontractorContract.findMany({
      where: { buildingId, subcontractorId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findAll(): Promise<SubcontractorContract[]> {
    const records = await this.prisma.subcontractorContract.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await this.prisma.subcontractorContract.update({
      where: { id: id.toValue() },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  private toDomain(record: {
    id: string;
    contractNumber: string;
    buildingId: string;
    subcontractorId: string;
    title: string;
    startDate: Date | null;
    endDate: Date | null;
    totalValue: import('@prisma/client/runtime/library').Decimal;
    terms: unknown;
    notes: string;
    status: string;
    createdBy: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): SubcontractorContract {
    const props: SubcontractorContractProps = {
      contractNumber: record.contractNumber,
      buildingId: record.buildingId,
      subcontractorId: record.subcontractorId,
      title: record.title,
      startDate: record.startDate,
      endDate: record.endDate,
      totalValue: Number(record.totalValue),
      terms: Array.isArray(record.terms)
        ? record.terms.map((t) => String(t))
        : null,
      notes: record.notes,
      status: record.status as ContractStatus,
      createdBy: record.createdBy,
      deletedAt: record.deletedAt,
    };
    return SubcontractorContract.reconstitute(
      props,
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
