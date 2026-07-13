// src/modules/final-boq/infrastructure/final-boq.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FinalBoq } from '../domain/final-boq.entity';
import { FinalBoqItem } from '../domain/final-boq-item.entity';
import { Component } from '../domain/component.entity';
import { Prisma } from '@prisma/client';
import { ConcurrencyException } from '../../../common/exceptions/concurrency.exception';

/**
 * Repository for the FinalBoq aggregate.
 * All persistence logic lives here; the service layer contains business rules.
 */
@Injectable()
export class FinalBoqRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a new FinalBoq with no items yet. */
  async create(finalBoq: FinalBoq): Promise<FinalBoq> {
    const data: Prisma.FinalBoqUncheckedCreateInput = {
      id: finalBoq.id,
      buildingId: finalBoq.buildingId,
      projectId: finalBoq.projectId,
      businessCode: finalBoq.businessCode,
      status: finalBoq.status,
      createdAt: finalBoq.createdAt,
      updatedAt: finalBoq.updatedAt,
    };
    await this.prisma.finalBoq.create({ data });
    return finalBoq;
  }

  async findById(id: string, includeDeleted = false): Promise<FinalBoq | null> {
    const where: Prisma.FinalBoqWhereUniqueInput & Prisma.FinalBoqWhereInput = { id };
    if (!includeDeleted) where.deletedAt = null;
    const record = await this.prisma.finalBoq.findFirst({
      where,
      include: { items: { include: { components: true } } },
    });
    return record as any;
  }

  /** Persist the entire aggregate in a transaction. */
  async save(finalBoq: FinalBoq): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Update root with optimistic locking
      const rootResult = await tx.finalBoq.updateMany({
        where: { id: finalBoq.id, version: finalBoq.version },
        data: {
          status: finalBoq.status,
          updatedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (rootResult.count === 0) {
        throw new ConcurrencyException('FinalBoq root concurrency conflict');
      }

      // Process each item
      for (const item of finalBoq.items) {
        const existingItem = await tx.finalBoqItem.findUnique({ where: { id: item.id } });
        if (existingItem) {
          const result = await tx.finalBoqItem.updateMany({
            where: { id: item.id, version: item.version },
            data: {
              businessCode: item.businessCode,
              description: item.description,
              unitPrice: item.unitPrice.toNumber(),
              quantity: item.quantity.toNumber(),
              sortOrder: item.sortOrder,
              parentItemId: item.parentItemId,
              updatedAt: new Date(),
              version: { increment: 1 },
            },
          });
          if (result.count === 0) {
            throw new ConcurrencyException('FinalBoqItem concurrency conflict');
          }
        } else {
          await tx.finalBoqItem.create({
            data: {
              id: item.id,
              finalBoqId: finalBoq.id,
              businessCode: item.businessCode,
              description: item.description,
              unitPrice: item.unitPrice.toNumber(),
              quantity: item.quantity.toNumber(),
              sortOrder: item.sortOrder,
              parentItemId: item.parentItemId,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            },
          });
        }

        // Process components of the item
        for (const comp of item.components) {
          const existingComp = await tx.component.findUnique({ where: { id: comp.id } });
          if (existingComp) {
            const compResult = await tx.component.updateMany({
              where: { id: comp.id, version: comp.version },
              data: {
                businessCode: comp.code,
                description: comp.description,
                unitPrice: comp.unitPrice,
                quantity: comp.quantity,
                lifecycleStatus: comp.lifecycleStatus,
                sortOrder: (comp as any).sortOrder || 0,
                updatedAt: new Date(),
                version: { increment: 1 },
              },
            });
            if (compResult.count === 0) {
              throw new ConcurrencyException('Component concurrency conflict');
            }
          } else {
            await tx.component.create({
              data: {
                id: comp.id,
                finalBoqItemId: item.id,
                businessCode: comp.code,
                description: comp.description,
                unitPrice: comp.unitPrice,
                quantity: comp.quantity,
                lifecycleStatus: comp.lifecycleStatus,
                sortOrder: (comp as any).sortOrder || 0,
                createdAt: (comp as any).createdAt,
                updatedAt: (comp as any).updatedAt,
              },
            });
          }
        }
      }
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.finalBoq.update({ where: { id }, data: { deletedAt: new Date() } });
    // cascade soft‑delete of child records
    await this.prisma.finalBoqItem.updateMany({
      where: { finalBoqId: id },
      data: { deletedAt: new Date() },
    });
    await this.prisma.component.updateMany({
      where: { finalBoqItem: { finalBoqId: id } },
      data: { deletedAt: new Date() },
    });
  }
}
