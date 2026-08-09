import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Client } from '../domain/client.entity';
import { IClientRepository } from '../domain/client.repository';

@Injectable()
export class PrismaClientRepository implements IClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(client: Client): Promise<void> {
    const data = {
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      contactPerson: client.contactPerson,
      joinDate: client.joinDate,
      status: client.status,
      deletedAt: client.deletedAt,
      updatedAt: new Date(),
    };

    await this.prisma.client.upsert({
      where: { id: client.id.toValue() },
      create: {
        id: client.id.toValue(),
        ...data,
        createdAt: client.createdAt,
      },
      update: data,
    });
  }

  async findById(id: UniqueEntityId): Promise<Client | null> {
    const record = await this.prisma.client.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Client[]> {
    const records = await this.prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    contactPerson: string;
    joinDate: Date | null;
    status: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Client {
    return Client.reconstitute(
      {
        name: record.name,
        email: record.email,
        phone: record.phone,
        address: record.address,
        contactPerson: record.contactPerson,
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
