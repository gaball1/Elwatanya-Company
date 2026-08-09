import { Injectable } from '@nestjs/common';
import { BaseWorkflow, WorkflowState } from './base.workflow';

@Injectable()
export class WorkflowRegistryService {
  private readonly workflows = new Map<string, BaseWorkflow>();
  private readonly states = new Map<string, WorkflowState>();

  register(workflow: BaseWorkflow): void {
    this.workflows.set(workflow.name, workflow);
  }

  get(name: string): BaseWorkflow | undefined {
    return this.workflows.get(name);
  }

  getAll(): BaseWorkflow[] {
    return Array.from(this.workflows.values());
  }

  getState(conversationId: string): WorkflowState | undefined {
    return this.states.get(conversationId);
  }

  setState(conversationId: string, state: WorkflowState): void {
    state.updatedAt = new Date();
    this.states.set(conversationId, state);
  }

  clearState(conversationId: string): void {
    this.states.delete(conversationId);
  }

  hasActiveWorkflow(conversationId: string): boolean {
    const state = this.states.get(conversationId);
    return state?.status === 'active';
  }

  getActiveWorkflowName(conversationId: string): string | undefined {
    const state = this.states.get(conversationId);
    return state?.status === 'active' ? state.name : undefined;
  }
}
