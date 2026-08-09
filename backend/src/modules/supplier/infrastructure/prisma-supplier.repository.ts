import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Supplier } from '../domain/supplier.entity';
import { ISupplierRepository } from '../domain/supplier.repository';

@Injectable()
export class PrismaSupplierRepository implements ISupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(supplier: Supplier): Promise<void> {
    const data = {
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      products: supplier.products,
      paymentTerms: supplier.paymentTerms,
      joinDate: supplier.joinDate,
      status: supplier.status,
      deletedAt: supplier.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.supplier.upsert({
      where: { id: supplier.id.toValue() },
      create: {
        id: supplier.id.toValue(),
        ...data,
        createdAt: supplier.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Supplier | null> {
    const record = await this.prisma.supplier.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Supplier[]> {
    const records = await this.prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    products: string[];
    paymentTerms: string;
    joinDate: Date | null;
    status: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Supplier {
    return Supplier.reconstitute(
      {
        name: record.name,
        contactPerson: record.contactPerson,
        phone: record.phone,
        email: record.email,
        address: record.address,
        products: record.products,
        paymentTerms: record.paymentTerms,
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
