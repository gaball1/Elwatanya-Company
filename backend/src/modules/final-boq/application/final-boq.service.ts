// src/modules/final-boq/application/final-boq.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { FinalBoqRepository } from '../infrastructure/final-boq.repository';
import { FinalBoq } from '../domain/final-boq.entity';
import { FinalBoqItem } from '../domain/final-boq-item.entity';
import { Component } from '../domain/component.entity';
import { FinalBoqStatus } from '../domain/final-boq-status.enum';
import { EventBus } from '../../../common/event-bus.interface';
import { AuditService } from '../../../common/audit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateFinalBoqDto } from './dto/create-final-boq.dto';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AddComponentDto } from './dto/add-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ValidationException } from '../../../common/exceptions/domain.exception';

/**
 * Application service orchestrating FinalBoq workflows.
 * All business invariants live in the domain entities; this service
 * handles persistence, transactions, event publishing, and audit logging.
 */
@Injectable()
export class FinalBoqService {
  private readonly logger = new Logger(FinalBoqService.name);

  constructor(
    private readonly repo: FinalBoqRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    private readonly auditService: AuditService,
  ) {}

  /** Create a new Final BOQ for a building */
  async create(dto: CreateFinalBoqDto, userId: string): Promise<FinalBoq> {
    const finalBoq = new FinalBoq({
      buildingId: dto.buildingId,
      projectId: dto.projectId,
      businessCode: dto.businessCode,
    });
    // audit fields will be attached by repository via Prisma defaults (createdAt)
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // persist root only; items empty for now
      await this.repo.create(finalBoq);
      // publish domain event
      await this.eventBus.publish({
        name: 'FinalBoqCreated',
        payload: { finalBoqId: finalBoq.id, projectId: dto.projectId, createdBy: userId },
      });
    });
    return finalBoq;
  }

  /** Add a new item to an existing Final BOQ */
  async addItem(finalBoqId: string, dto: AddItemDto, userId: string): Promise<FinalBoqItem> {
    const aggregate = await this.repo.findById(finalBoqId);
    if (!aggregate) {
      throw new NotFoundException('FinalBoq not found');
    }
    const item = new FinalBoqItem({
      finalBoqId,
      description: dto.description,
      unitPrice: dto.unitPrice,
      quantity: dto.quantity,
    });
    aggregate.addItem(item);
    // Save whole aggregate in a transaction
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.repo.save(aggregate);
      await this.eventBus.publish({
        name: 'FinalBoqItemAdded',
        payload: { finalBoqId, itemId: item.id, createdBy: userId },
      });
    });
    return item;
  }

  /** Update an existing item */
  async updateItem(finalBoqId: string, itemId: string, dto: UpdateItemDto, userId: string): Promise<FinalBoqItem> {
    const aggregate = await this.repo.findById(finalBoqId);
    if (!aggregate) throw new NotFoundException('FinalBoq not found');
    const item = aggregate.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('FinalBoqItem not found');
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.unitPrice !== undefined) item.unitPrice = new Decimal(dto.unitPrice);
    if (dto.quantity !== undefined) item.quantity = new Decimal(dto.quantity);
    // re‑validate component price rule after possible price change
    item.validateComponentPrices();
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.repo.save(aggregate);
      await this.eventBus.publish({
        name: 'FinalBoqItemUpdated',
        payload: { finalBoqId, itemId, updatedBy: userId },
      });
    });
    return item;
  }

  /** Delete an item (soft delete) */
  async deleteItem(finalBoqId: string, itemId: string, userId: string): Promise<void> {
    const aggregate = await this.repo.findById(finalBoqId);
    if (!aggregate) throw new NotFoundException('FinalBoq not found');
    // Soft‑delete the item via Prisma directly – ensures cascade of components
    await this.prisma.finalBoqItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
    await this.eventBus.publish({
      name: 'FinalBoqItemDeleted',
      payload: { finalBoqId, itemId, deletedBy: userId },
    });
  }

  /** Add a component to a specific item */
  async addComponent(finalBoqId: string, itemId: string, dto: AddComponentDto, userId: string): Promise<Component> {
    const aggregate = await this.repo.findById(finalBoqId);
    if (!aggregate) throw new NotFoundException('FinalBoq not found');
    const item = aggregate.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('FinalBoqItem not found');
    const component = new Component({
      finalBoqItemId: itemId,
      code: dto.code,
      description: dto.description,
      unitPrice: dto.unitPrice,
      quantity: dto.quantity,
      lifecycleStatus: dto.lifecycleStatus,
    });
    item.addComponent(component);
    // Persist whole aggregate (components upsert handled in repo)
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.repo.save(aggregate);
      await this.eventBus.publish({
        name: 'ComponentAdded',
        payload: { finalBoqId, itemId, componentId: component.id, createdBy: userId },
      });
    });
    return component;
  }

  /** Update an existing component */
  async updateComponent(
    finalBoqId: string,
    itemId: string,
    componentId: string,
    dto: UpdateComponentDto,
    userId: string,
  ): Promise<Component> {
    const aggregate = await this.repo.findById(finalBoqId);
    if (!aggregate) throw new NotFoundException('FinalBoq not found');
    const item = aggregate.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('FinalBoqItem not found');
    const component = item.components.find((c) => c.id === componentId);
    if (!component) throw new NotFoundException('Component not found');
    if (dto.code !== undefined) component.code = dto.code;
    if (dto.description !== undefined) component.description = dto.description;
    if (dto.unitPrice !== undefined) component.unitPrice = dto.unitPrice;
    if (dto.quantity !== undefined) component.quantity = dto.quantity;
    if (dto.lifecycleStatus !== undefined) component.lifecycleStatus = dto.lifecycleStatus;
    // Re‑validate price rule at item level
    item.validateComponentPrices();
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.repo.save(aggregate);
      await this.eventBus.publish({
        name: 'ComponentUpdated',
        payload: { finalBoqId, itemId, componentId, updatedBy: userId },
      });
    });
    return component;
  }

  /** Delete (soft) a component */
  async deleteComponent(finalBoqId: string, itemId: string, componentId: string, userId: string): Promise<void> {
    // Direct soft‑delete via Prisma; component belongs to itemId
    await this.prisma.component.update({
      where: { id: componentId },
      data: { deletedAt: new Date() },
    });
    await this.eventBus.publish({
      name: 'ComponentDeleted',
      payload: { finalBoqId, itemId, componentId, deletedBy: userId },
    });
  }

  /** Change status of the FinalBoq aggregate */
  async changeStatus(finalBoqId: string, dto: ChangeStatusDto, userId: string): Promise<FinalBoq> {
    const aggregate = await this.repo.findById(finalBoqId);
    if (!aggregate) throw new NotFoundException('FinalBoq not found');
    const targetStatus = dto.status as FinalBoqStatus;
    try {
      aggregate.changeStatus(targetStatus);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.repo.save(aggregate);
      await this.eventBus.publish({
        name: 'FinalBoqStatusChanged',
        payload: { finalBoqId, from: aggregate.status, to: targetStatus, changedBy: userId },
      });
    });
    return aggregate;
  }
}
