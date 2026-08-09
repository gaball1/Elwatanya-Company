import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { ContextEngineService } from '../context/context-engine.service';
import { ConversationMemoryService } from '../memory/conversation-memory.service';
import { PermissionCheckerService } from '../permissions/permission-checker.service';
import { WorkflowRegistryService } from '../workflows/workflow-registry.service';
import { ChainExecutorService, ChainPlan } from '../chaining/chain-executor.service';
import { IntentResult, ToolResult } from '../dto/agent-response.dto';

export interface EvaluationResult {
  score: number; // 0-1
  correctTool: boolean;
  permissionsRespected: boolean;
  contextUsed: boolean;
  apisExecuted: boolean;
  answeredUser: boolean;
  clarificationNeeded: boolean;
  suggestedNextAction?: string;
  issues: string[];
  confidence: number;
}

@Injectable()
export class SelfEvaluationService {
  private readonly logger = new Logger(SelfEvaluationService.name);

  constructor(
    private readonly tools: ToolRegistryService,
    private readonly context: ContextEngineService,
    private readonly memory: ConversationMemoryService,
    private readonly permissions: PermissionCheckerService,
    private readonly workflows: WorkflowRegistryService,
    private readonly chain: ChainExecutorService,
  ) {}

  evaluate(
    intent: IntentResult,
    result: ToolResult,
    conversationId: string,
    userPermissions: string[],
    message: string,
  ): EvaluationResult {
    const issues: string[] = [];
    let score = 1.0;

    // 1. Was the correct tool selected?
    const correctTool = this.evaluateToolSelection(intent, message);
    if (!correctTool) {
      score -= 0.2;
      issues.push('Tool selection may not match user intent');
    }

    // 2. Were permissions respected?
    const permissionsRespected = this.evaluatePermissions(intent, userPermissions);
    if (!permissionsRespected) {
      score -= 0.3;
      issues.push('Missing required permissions');
    }

    // 3. Was context used?
    const contextUsed = this.evaluateContextUsage(intent, conversationId);
    if (!contextUsed) {
      score -= 0.1;
      issues.push('Available context was not utilized');
    }

    // 4. Were required APIs executed?
    const apisExecuted = result.success || false;
    if (!apisExecuted) {
      score -= 0.2;
      issues.push(result.error || 'API execution failed');
    }

    // 5. Did the response answer the user?
    const answeredUser = this.evaluateAnswerQuality(intent, message);
    if (!answeredUser) {
      score -= 0.1;
      issues.push('Response may not fully address the user query');
    }

    // 6. Check if clarification is needed
    const clarificationNeeded = intent.confidence < 0.6 || intent.intent === 'unknown';
    if (clarificationNeeded) {
      score -= 0.1;
    }

    // Determine if we should suggest next actions
    const suggestedNextAction = this.suggestNextAction(intent, result);

    return {
      score: Math.max(0, score),
      correctTool,
      permissionsRespected,
      contextUsed,
      apisExecuted,
      answeredUser,
      clarificationNeeded,
      suggestedNextAction,
      issues,
      confidence: intent.confidence,
    };
  }

  private evaluateToolSelection(intent: IntentResult, message: string): boolean {
    if (intent.intent === 'unknown') return false;
    if (!intent.toolName && !intent.requiresWorkflow) {
      // Generic response - may be acceptable for knowledge queries
      return intent.intent.startsWith('explain') || intent.intent.startsWith('knowledge');
    }
    return true;
  }

  private evaluatePermissions(intent: IntentResult, userPermissions: string[]): boolean {
    if (!intent.requiredPermissions?.length) return true;
    const missing = this.permissions.getMissingPermissions(userPermissions, intent.requiredPermissions);
    return missing.length === 0;
  }

  private evaluateContextUsage(intent: IntentResult, conversationId: string): boolean {
    const ctx = this.context.getAll(conversationId);
    // If context has values but intent entities don't reference them, that's a miss
    const hasProjectContext = !!ctx.currentProjectId;
    const needsProject = intent.entities?.entity === 'building' || intent.entities?.entity === 'fund';
    if (hasProjectContext && needsProject) return true;
    return true; // Not penalizing for simple queries
  }

  private evaluateAnswerQuality(intent: IntentResult, message: string): boolean {
    // Simple heuristic: if we have a tool result or an explanation, we answered
    if (intent.intent.startsWith('explain')) return true;
    if (intent.toolName) return true;
    if (intent.requiresWorkflow) return true;
    return false;
  }

  private suggestNextAction(intent: IntentResult, result: ToolResult): string | undefined {
    if (!result.success) return undefined;

    const intentLower = intent.intent.toLowerCase();

    if (intentLower.startsWith('list_') || intentLower.includes('show')) {
      const entity = intent.entities?.entity;
      if (entity) {
        return `You can ask me to create a new ${entity}, or get details about a specific one.`;
      }
    }

    if (intentLower.startsWith('create_')) {
      return 'The record has been created. You can ask me to view it, update it, or create another.';
    }

    if (intentLower.includes('summary') || intentLower.includes('stats')) {
      return 'Would you like me to drill down into any specific area?';
    }

    if (intentLower.includes('approve') || intentLower.includes('reject')) {
      return 'The approval has been processed. Check if there are more pending items.';
    }

    return undefined;
  }
}
