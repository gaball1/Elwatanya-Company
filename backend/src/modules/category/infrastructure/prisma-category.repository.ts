import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Category } from '../domain/category.entity';
import { ICategoryRepository } from '../domain/category.repository';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(category: Category): Promise<void> {
    const id = category.id.toValue();
    const existing = await this.prisma.category.findFirst({
      where: { id },
      select: { id: true },
    });

    if (existing) {
      const duplicate = await this.prisma.category.findFirst({
        where: { code: category.code, deletedAt: null, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error(`A category with code "${category.code}" already exists`);
      }
      await this.prisma.category.update({
        where: { id },
        data: {
          code: category.code,
          name: category.name,
          description: category.description,
          parentId: category.parentId || null,
          status: category.status,
          deletedAt: category.deletedAt,
          updatedAt: new Date(),
        },
      });
    } else {
      const duplicate = await this.prisma.category.findFirst({
        where: { code: category.code, deletedAt: null },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error(`A category with code "${category.code}" already exists`);
      }
      await this.prisma.category.create({
        data: {
          id,
          code: category.code,
          name: category.name,
          description: category.description,
          parentId: category.parentId || null,
          status: category.status,
          deletedAt: category.deletedAt,
          createdAt: category.createdAt,
          updatedAt: new Date(),
        },
      });
    }
  }

  async findById(id: UniqueEntityId): Promise<Category | null> {
    const record = await this.prisma.category.findFirst({
      where: { id: id.toValue(), deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    code: string;
    name: string;
    description: string;
    parentId: string | null;
    status: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Category {
    return Category.reconstitute(
      {
        code: record.code,
        name: record.name,
        description: record.description,
        parentId: record.parentId ?? '',
        status: record.status,
        deletedAt: record.deletedAt,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
