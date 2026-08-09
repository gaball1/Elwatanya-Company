import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SignatureWorkflowRepository {
  private readonly logger = new Logger(SignatureWorkflowRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createWorkflow(data: { id?: string; name: string; description?: string; entityType: string; isActive?: boolean; steps: any[] }) {
    const id = data.id || crypto.randomUUID();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "SignatureWorkflow" (id, name, description, "entityType", "isActive") VALUES ($1, $2, $3, $4, $5)`,
      id, data.name, data.description || '', data.entityType, data.isActive ?? true,
    );
    for (let i = 0; i < data.steps.length; i++) {
      const s = data.steps[i];
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "SignatureWorkflowStep" (id, "workflowId", "stepOrder", label, "roleName", "userId", "isFinal") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        crypto.randomUUID(), id, i + 1, s.label, s.roleName || null, s.userId || null, s.isFinal ?? (i === data.steps.length - 1),
      );
    }
    return this.getWorkflow(id);
  }

  async getWorkflow(id: string) {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "SignatureWorkflow" WHERE id = $1`, id,
    );
    if (rows.length === 0) return null;
    const steps: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "SignatureWorkflowStep" WHERE "workflowId" = $1 ORDER BY "stepOrder" ASC`, id,
    );
    return { ...rows[0], steps };
  }

  async getWorkflows(entityType?: string) {
    const rows: any[] = entityType
      ? await this.prisma.$queryRawUnsafe(`SELECT * FROM "SignatureWorkflow" WHERE "entityType" = $1 ORDER BY "name"`, entityType)
      : await this.prisma.$queryRawUnsafe(`SELECT * FROM "SignatureWorkflow" ORDER BY "name"`);

    for (const row of rows) {
      row.steps = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "SignatureWorkflowStep" WHERE "workflowId" = $1 ORDER BY "stepOrder" ASC`, row.id,
      );
    }
    return rows;
  }

  async updateWorkflow(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (data.name !== undefined) { sets.push(`name = $${idx++}`); values.push(data.name); }
    if (data.description !== undefined) { sets.push(`description = $${idx++}`); values.push(data.description); }
    if (data.isActive !== undefined) { sets.push(`"isActive" = $${idx++}`); values.push(data.isActive); }
    values.push(id);
    await this.prisma.$executeRawUnsafe(
      `UPDATE "SignatureWorkflow" SET ${sets.join(', ')} WHERE id = $${idx}`,
      ...values,
    );
    return this.getWorkflow(id);
  }

  async deleteWorkflow(id: string) {
    await this.prisma.$executeRawUnsafe(`DELETE FROM "SignatureAction" WHERE "requestId" IN (SELECT id FROM "SignatureRequest" WHERE "workflowId" = $1)`, id);
    await this.prisma.$executeRawUnsafe(`DELETE FROM "SignatureRequest" WHERE "workflowId" = $1`, id);
    await this.prisma.$executeRawUnsafe(`DELETE FROM "SignatureWorkflowStep" WHERE "workflowId" = $1`, id);
    await this.prisma.$executeRawUnsafe(`DELETE FROM "SignatureWorkflow" WHERE id = $1`, id);
  }

  async createRequest(data: { workflowId: string; entityType: string; entityId: string; requestedBy: string; steps: any[] }) {
    const id = crypto.randomUUID();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "SignatureRequest" (id, "workflowId", "entityType", "entityId", "requestedBy") VALUES ($1, $2, $3, $4, $5)`,
      id, data.workflowId, data.entityType, data.entityId, data.requestedBy,
    );
    for (const step of data.steps) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "SignatureAction" (id, "requestId", "stepId", "stepOrder") VALUES ($1, $2, $3, $4)`,
        crypto.randomUUID(), id, step.id, step.stepOrder,
      );
    }
    return this.getRequest(id);
  }

  async getRequest(id: string) {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "SignatureRequest" WHERE id = $1`, id,
    );
    if (rows.length === 0) return null;
    const actions: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT a.*, s.label as "stepLabel", s."roleName", s."userId" as "stepUserId" FROM "SignatureAction" a JOIN "SignatureWorkflowStep" s ON a."stepId" = s.id WHERE a."requestId" = $1 ORDER BY a."stepOrder" ASC`, id,
    );
    return { ...rows[0], actions };
  }

  async getRequestByEntity(entityType: string, entityId: string) {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "SignatureRequest" WHERE "entityType" = $1 AND "entityId" = $2`, entityType, entityId,
    );
    if (rows.length === 0) return null;
    const actions: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT a.*, s.label as "stepLabel", s."roleName", s."userId" as "stepUserId" FROM "SignatureAction" a JOIN "SignatureWorkflowStep" s ON a."stepId" = s.id WHERE a."requestId" = $1 ORDER BY a."stepOrder" ASC`, rows[0].id,
    );
    return { ...rows[0], actions };
  }

  async updateAction(actionId: string, data: { status?: string; signedBy?: string; signedAt?: Date; comment?: string; imageUrl?: string }) {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (data.status !== undefined) { sets.push(`status = $${idx++}`); values.push(data.status); }
    if (data.signedBy !== undefined) { sets.push(`"signedBy" = $${idx++}`); values.push(data.signedBy); }
    if (data.signedAt !== undefined) { sets.push(`"signedAt" = $${idx++}`); values.push(data.signedAt); }
    if (data.comment !== undefined) { sets.push(`comment = $${idx++}`); values.push(data.comment); }
    if (data.imageUrl !== undefined) { sets.push(`"imageUrl" = $${idx++}`); values.push(data.imageUrl); }
    values.push(actionId);
    await this.prisma.$executeRawUnsafe(
      `UPDATE "SignatureAction" SET ${sets.join(', ')} WHERE id = $${idx}`,
      ...values,
    );
  }

  async updateRequest(id: string, data: { status?: string; currentStep?: number; completedAt?: Date | null }) {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (data.status !== undefined) { sets.push(`status = $${idx++}`); values.push(data.status); }
    if (data.currentStep !== undefined) { sets.push(`"currentStep" = $${idx++}`); values.push(data.currentStep); }
    if (data.completedAt !== undefined) { sets.push(`"completedAt" = $${idx++}`); values.push(data.completedAt); }
    values.push(id);
    await this.prisma.$executeRawUnsafe(
      `UPDATE "SignatureRequest" SET ${sets.join(', ')} WHERE id = $${idx}`,
      ...values,
    );
  }

  async getPendingRequests(userId: string, roleName: string) {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT r.* FROM "SignatureRequest" r
       WHERE r.status IN ('pending', 'in_progress')
       AND EXISTS (
         SELECT 1 FROM "SignatureAction" a
         JOIN "SignatureWorkflowStep" s ON a."stepId" = s.id
         WHERE a."requestId" = r.id AND a.status = 'pending'
         AND (s."userId" = $1 OR s."roleName" = $2)
       )
       ORDER BY r."requestedAt" DESC`,
      userId, roleName,
    );
    for (const row of rows) {
      row.actions = await this.prisma.$queryRawUnsafe(
        `SELECT a.*, s.label as "stepLabel", s."roleName", s."userId" as "stepUserId" FROM "SignatureAction" a JOIN "SignatureWorkflowStep" s ON a."stepId" = s.id WHERE a."requestId" = $1 ORDER BY a."stepOrder" ASC`, row.id,
      );
    }
    return rows;
  }

  async getCurrentAction(requestId: string, currentStep: number) {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT a.*, s.label as "stepLabel", s."isFinal" FROM "SignatureAction" a
       JOIN "SignatureWorkflowStep" s ON a."stepId" = s.id
       WHERE a."requestId" = $1 AND a."stepOrder" = $2`,
      requestId, currentStep,
    );
    return rows[0] || null;
  }
}
