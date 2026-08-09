import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SignatureWorkflowRepository } from '../infrastructure/signature-workflow.repository';

@Injectable()
export class SignatureWorkflowService {
  private readonly logger = new Logger(SignatureWorkflowService.name);

  constructor(private readonly repo: SignatureWorkflowRepository) {}

  async createWorkflow(data: { name: string; description?: string; entityType: string; steps: { label: string; roleName?: string; userId?: string; isFinal?: boolean }[] }) {
    return this.repo.createWorkflow(data);
  }

  async getWorkflows(entityType?: string) {
    return this.repo.getWorkflows(entityType);
  }

  async getWorkflow(id: string) {
    const wf = await this.repo.getWorkflow(id);
    if (!wf) throw new NotFoundException(`Workflow '${id}' not found`);
    return wf;
  }

  async updateWorkflow(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    const wf = await this.repo.getWorkflow(id);
    if (!wf) throw new NotFoundException(`Workflow '${id}' not found`);
    return this.repo.updateWorkflow(id, data);
  }

  async deleteWorkflow(id: string) {
    const wf = await this.repo.getWorkflow(id);
    if (!wf) throw new NotFoundException(`Workflow '${id}' not found`);
    await this.repo.deleteWorkflow(id);
  }

  async submitForSignature(workflowId: string, entityType: string, entityId: string, requestedBy: string) {
    const wf = await this.getWorkflow(workflowId);
    if (!wf.isActive) throw new BadRequestException('Workflow is inactive');

    const existing = await this.repo.getRequestByEntity(entityType, entityId);
    if (existing) throw new BadRequestException('Document already submitted for signature');

    return this.repo.createRequest({
      workflowId,
      entityType,
      entityId,
      requestedBy,
      steps: wf.steps,
    });
  }

  async sign(requestId: string, userId: string, status: 'signed' | 'rejected', comment?: string, imageUrl?: string) {
    const request = await this.repo.getRequest(requestId);
    if (!request) throw new NotFoundException('Signature request not found');
    if (request.status === 'completed' || request.status === 'rejected') {
      throw new BadRequestException(`Request already ${request.status}`);
    }

    const wf = await this.getWorkflow(request.workflowId);
    const currentStep = wf.steps.find((s: any) => s.stepOrder === request.currentStep);
    if (!currentStep) throw new BadRequestException('No pending step found');

    const currentAction = request.actions.find((a: any) => a.stepOrder === request.currentStep);
    if (!currentAction) throw new BadRequestException('No pending action found');

    await this.repo.updateAction(currentAction.id, {
      status,
      signedBy: userId,
      signedAt: new Date(),
      comment: comment || '',
      imageUrl,
    });

    if (status === 'rejected') {
      await this.repo.updateRequest(requestId, { status: 'rejected', completedAt: new Date() });
      return { requestId, status: 'rejected', step: currentAction.stepOrder };
    }

    const isFinal = currentStep.isFinal ?? false;
    if (isFinal) {
      await this.repo.updateRequest(requestId, { status: 'completed', completedAt: new Date() });
      return { requestId, status: 'completed' };
    }

    await this.repo.updateRequest(requestId, { status: 'in_progress', currentStep: request.currentStep + 1 });
    return { requestId, status: 'in_progress', nextStep: request.currentStep + 1 };
  }

  async getSignatureStatus(entityType: string, entityId: string) {
    const request = await this.repo.getRequestByEntity(entityType, entityId);
    return request;
  }

  async getPendingRequests(userId: string, roleName: string) {
    return this.repo.getPendingRequests(userId, roleName);
  }
}
