import { Injectable } from '@nestjs/common';
import { ConversationMemoryService } from '../memory/conversation-memory.service';

export interface ErpContext {
  currentProjectId?: string;
  currentProjectName?: string;
  currentBuildingId?: string;
  currentBuildingName?: string;
  currentEmployeeId?: string;
  currentContractorId?: string;
  currentContractorName?: string;
  currentSupplierId?: string;
  currentBoqId?: string;
  currentBoqType?: string;
  currentPurchaseId?: string;
  currentApprovalId?: string;
  currentExtractId?: string;
  currentStatementId?: string;
  currentPaymentId?: string;
  // Resolved lists kept for follow-up composition
  _buildings?: any[];
  _extracts?: any[];
  _payments?: any[];
  _approvals?: any[];
  _dues?: any;
  currentPage?: string;
  currentModule?: string;
  userId?: string;
  userRole?: string;
  userPermissions?: string[];
  // Workflow tracking
  activeWorkflow?: string;
  workflowPhase?: string;
  workflowStep?: number;
  // Auto-filled from previous turns
  lastEntityType?: string;
  lastEntityId?: string;
  lastAction?: string;
  lastResult?: any;
}

@Injectable()
export class ContextEngineService {
  private readonly contexts = new Map<string, ErpContext>();

  constructor(private readonly memory: ConversationMemoryService) {}

  get(conversationId: string): ErpContext {
    return this.contexts.get(conversationId) || {};
  }

  set(conversationId: string, key: string, value: any): void {
    const existing = this.contexts.get(conversationId) || {};
    (existing as any)[key] = value;
    this.contexts.set(conversationId, existing);
  }

  update(conversationId: string, updates: Partial<ErpContext>): void {
    const existing = this.contexts.get(conversationId) || {};
    Object.assign(existing, updates);
    this.contexts.set(conversationId, existing);
  }

  clear(conversationId: string): void {
    this.contexts.delete(conversationId);
  }

  getAll(conversationId: string): Record<string, any> {
    return { ...this.contexts.get(conversationId) };
  }

  /** Auto-fill context from available conversation history */
  enrichFromHistory(conversationId: string, message: string): void {
    const ctx = this.contexts.get(conversationId);
    if (!ctx) return;

    // Detect UUID references and auto-set context
    const uuids = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
    if (uuids) {
      for (const uuid of uuids) {
        if (!ctx.currentProjectId) { ctx.currentProjectId = uuid; break; }
        if (!ctx.currentBuildingId) { ctx.currentBuildingId = uuid; break; }
        if (!ctx.currentEmployeeId) { ctx.currentEmployeeId = uuid; break; }
      }
    }

    // Detect entity mentions from message
    const lower = message.toLowerCase();
    if (lower.includes('project') && ctx.currentProjectId) {
      // Already set
    }
    if (lower.includes('building') && ctx.currentBuildingId) {
      // Already set
    }
    if (lower.includes('employee') && ctx.currentEmployeeId) {
      // Already set
    }
  }

  /** Get a summary of what the agent knows about the current context */
  getContextSummary(conversationId: string): string {
    const ctx = this.contexts.get(conversationId);
    if (!ctx) return 'No context yet.';

    const parts: string[] = [];
    if (ctx.currentProjectName) parts.push(`Project: ${ctx.currentProjectName}`);
    if (ctx.currentBuildingName) parts.push(`Building: ${ctx.currentBuildingName}`);
    if (ctx.currentContractorName) parts.push(`Contractor: ${ctx.currentContractorName}`);
    if (ctx.currentEmployeeId) parts.push(`Employee selected`);
    if (ctx.currentModule) parts.push(`Module: ${ctx.currentModule}`);
    if (ctx.activeWorkflow) parts.push(`Active workflow: ${ctx.activeWorkflow} (phase: ${ctx.workflowPhase || 'starting'})`);

    return parts.length > 0 ? parts.join(' | ') : 'General conversation';
  }

  /** Check if a specific value is already in context */
  hasValue(conversationId: string, key: keyof ErpContext): boolean {
    const ctx = this.contexts.get(conversationId);
    return ctx ? (ctx as any)[key] !== undefined && (ctx as any)[key] !== null : false;
  }
}
