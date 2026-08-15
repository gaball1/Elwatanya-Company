import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { DomainEvent } from '@/modules/domain-events/domain/event-bus.interface';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateWarehouseUseCase } from './use-cases/create-warehouse.use-case';

/**
 * Guarantees every project has a default warehouse:
 * - when a project is created (ProjectCreated event)
 * - for any existing project that has none (self-healing backfill on startup)
 *
 * The receive-purchases flow requires a destination warehouse, so a project
 * must never be left without one.
 */
@Injectable()
export class ProjectWarehouseSubscriber implements OnModuleInit {
  private readonly logger = new Logger(ProjectWarehouseSubscriber.name);

  constructor(
    private readonly eventBus: EventBusImpl,
    private readonly prisma: PrismaService,
    private readonly createWarehouse: CreateWarehouseUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    this.eventBus.subscribe('ProjectCreated', {
      handle: async (event: DomainEvent) => {
        const { id, name, code } = event.payload ?? {};
        if (!id) return;
        await this.ensureProjectWarehouse({ id, name, code });
      },
    });

    try {
      await this.backfillProjectsWithoutWarehouse();
    } catch (error) {
      this.logger.warn(`Warehouse backfill failed: ${(error as Error).message}`);
    }
    this.logger.log('Project warehouse subscriber listening for ProjectCreated events');
  }

  private async backfillProjectsWithoutWarehouse(): Promise<void> {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        warehouses: {
          where: { deletedAt: null },
          select: { id: true },
          take: 1,
        },
      },
    });

    let created = 0;
    for (const project of projects) {
      if (project.warehouses.length > 0) continue;
      if (await this.ensureProjectWarehouse(project)) created += 1;
    }
    if (created > 0) {
      this.logger.log(`Created ${created} default warehouse(s) for projects without one`);
    }
  }

  /**
   * Creates the project's default warehouse when it is missing. Returns true
   * when the warehouse exists (already or after creation).
   */
  private async ensureProjectWarehouse(project: {
    id: string;
    name: string;
    code: string;
  }): Promise<boolean> {
    const existing = await this.prisma.warehouse.findFirst({
      where: { projectId: project.id, deletedAt: null },
      select: { id: true },
    });
    if (existing) return true;

    const name = `مخزن ${project.name}`;
    const attempts = [
      { code: `WH-${project.code}`, name },
      { code: `WH-${project.code}`, name: `${name} - ${project.code}` },
      { code: `WH-${project.code}-1`, name },
    ];

    for (const attempt of attempts) {
      const result = await this.createWarehouse.execute({
        projectId: project.id,
        code: attempt.code,
        name: attempt.name,
        status: 'active',
      });
      if (result.isSuccess) return true;
    }

    this.logger.warn(`Could not auto-create a default warehouse for project ${project.code}`);
    return false;
  }
}
