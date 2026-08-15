import { Injectable, Logger } from '@nestjs/common';
import { AgentResponseDto } from '../dto/agent-response.dto';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { PermissionCheckerService } from '../permissions/permission-checker.service';
import { ContextEngineService } from '../context/context-engine.service';
import { AgentAnalyticsService } from '../analytics/agent-analytics.service';
import { AgentHttpClient } from '../tools/http-client';
import { AgentPromptBuilder } from './agent-prompt.builder';
import { LlmProviderService } from './llm-provider.service';
import { LlmMessage } from './llm.types';
import { BaseTool } from '../tools/base.tool';
import { pickBest, sanitizeUuids } from '../tools/resolution.utils';
import { MemoryEntry } from '../memory/conversation-memory.service';

export interface LlmAgentUser {
  sub: string;
  email: string;
  permissions: string[];
  role: string;
  projectId?: string;
  token: string;
}

const MAX_TOOL_RESULT_CHARS = 5000;

/**
 * Tools that return canned/placeholder data instead of real ERP figures.
 * They must never be offered to the LLM: an answer built on them would be
 * fabricated, which violates the grounding contract.
 */
const LLM_EXCLUDED_TOOLS = new Set(['get_kpi', 'get_trends', 'get_comparison', 'get_forecast']);

/**
 * LLM-first agent: the model chooses tools (filtered by the user's RBAC),
 * tools are executed against real ERP endpoints, and the model composes the
 * final Arabic/English answer strictly from the returned data.
 */
@Injectable()
export class LlmAgentService {
  private readonly logger = new Logger(LlmAgentService.name);

  constructor(
    private readonly llm: LlmProviderService,
    private readonly promptBuilder: AgentPromptBuilder,
    private readonly tools: ToolRegistryService,
    private readonly permissions: PermissionCheckerService,
    private readonly context: ContextEngineService,
    private readonly analytics: AgentAnalyticsService,
    private readonly api: AgentHttpClient,
  ) {}

  isAvailable(): boolean {
    return this.llm.isAvailable();
  }

  async process(
    message: string,
    conversationId: string,
    user: LlmAgentUser,
    history: MemoryEntry[],
  ): Promise<AgentResponseDto> {
    const maxIterations = this.llm.getConfig().maxIterations;
    const availableTools = this.availableTools(user);
    const defs = this.promptBuilder.buildToolDefinitions(availableTools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })));

    const ctxSummary = this.context.getContextSummary(conversationId);
    const contextBlock = ctxSummary && ctxSummary !== 'General conversation'
      ? `\n\nConversation context (may help resolve entities): ${ctxSummary}`
      : '';

    const messages: LlmMessage[] = [
      { role: 'system', content: this.promptBuilder.buildSystemPrompt(user) + contextBlock },
      ...history.slice(-10).map((h) => ({ role: h.role as 'user' | 'assistant', content: h.message })),
      { role: 'user', content: message },
    ];

    const dataAccumulator: any[] = [];
    let primaryTool: string | null = null;
    let iterations = 0;

    try {
      while (iterations < maxIterations) {
        const result = await this.llm.chat(messages, defs);
        if (!result) {
          return this.fallbackUnavailable(message, conversationId, user, 'llm_unavailable');
        }

        if (result.toolCalls.length === 0) {
          const content = result.content ?? 'Done.';
          return this.buildResponse(content, conversationId, primaryTool || 'llm', dataAccumulator, true);
        }

        messages.push({ role: 'assistant', content: result.content ?? '', toolCalls: result.toolCalls });

        for (const call of result.toolCalls) {
          const tool = this.tools.get(call.name);
          if (!tool) {
            this.pushToolResult(messages, call.id, 'ERROR: tool not found');
            continue;
          }
          if (tool.requiresPermission && !this.permissions.hasPermission(user.permissions, tool.requiresPermission)) {
            this.analytics.trackToolCall(tool.name, false);
            this.pushToolResult(messages, call.id, 'ERROR: you do not have permission to use this tool.');
            continue;
          }

          const args = await this.resolveArgs(call.arguments, user, conversationId);
          let resultOk = false;
          try {
            const toolResult = await tool.execute(args, user, this.context.getAll(conversationId));
            resultOk = toolResult.success;
            if (toolResult.data) dataAccumulator.push(toolResult.data);
            if (!primaryTool) primaryTool = tool.name;
            this.analytics.trackToolCall(tool.name, resultOk);

            if (resultOk && toolResult.data) {
              this.updateContext(conversationId, tool.name, toolResult.data);
            }

            const content = resultOk
              ? this.truncate(JSON.stringify(toolResult.data))
              : `ERROR: ${toolResult.error || 'Unknown tool error'}`;
            this.pushToolResult(messages, call.id, content);
          } catch (error: any) {
            this.analytics.trackError();
            this.pushToolResult(messages, call.id, `ERROR: ${error.message}`);
          }
        }

        iterations++;
      }

      return this.buildResponse(
        'Reached the maximum number of analysis steps. Please refine your question.',
        conversationId,
        primaryTool || 'llm',
        dataAccumulator,
        true,
      );
    } catch (error: any) {
      this.logger.error(`LLM agent failed: ${error.message}`);
      this.analytics.trackError();
      return this.fallbackUnavailable(message, conversationId, user, 'llm_error');
    }
  }

  /**
   * Filter tools to those the user may actually call (RBAC). The model never
   * sees a tool it could not use, so unauthorized data cannot leak.
   */
  private availableTools(user: LlmAgentUser): BaseTool[] {
    return this.tools.getAll().filter(
      (t) => !t.requiresPermission || this.permissions.hasPermission(user.permissions, t.requiresPermission),
    ).filter((t) => !LLM_EXCLUDED_TOOLS.has(t.name));
  }

  private pushToolResult(messages: LlmMessage[], toolCallId: string, content: string): void {
    messages.push({ role: 'tool', toolCallId, content });
  }

  private truncate(value: string): string {
    return value.length > MAX_TOOL_RESULT_CHARS ? `${value.slice(0, MAX_TOOL_RESULT_CHARS)}... [truncated]` : value;
  }

  /**
   * Best-effort entity resolution for arguments the model produced by name
   * (projects/buildings/contractors/employees) — resolve them to IDs before
   * the tool runs, mirroring the deterministic path.
   */
  private async resolveArgs(args: Record<string, any>, user: LlmAgentUser, conversationId: string): Promise<Record<string, any>> {
    const resolved: Record<string, any> = { ...args };
    const ctx = this.context.getAll(conversationId);

    if (!resolved.projectId && !resolved.id) {
      const name = resolved.projectName || resolved.currentProjectName || resolved.projectCode;
      const ctxProject = ctx.projectId || ctx.currentProjectId;
      if (ctxProject) {
        resolved.projectId = ctxProject;
      } else if (name) {
        const id = await this.resolveEntityId('/api/v1/projects', name, user.token, (p: any) => `${p.code} ${p.name}`);
        if (id) resolved.projectId = id;
      }
    }

    if (!resolved.buildingId) {
      const name = resolved.buildingName || resolved.currentBuildingName;
      if (name && (resolved.projectId || ctx.projectId || ctx.currentProjectId)) {
        const projectId = resolved.projectId || ctx.projectId || ctx.currentProjectId;
        try {
          const data = await this.api.get(`/api/v1/projects/${projectId}/buildings`, user.token);
          const items = data?.data?.items || data?.items || [];
          const best = pickBest(items, name, (b: any) => `${b.name} ${b.code || ''}`);
          if (best?.id) resolved.buildingId = best.id;
        } catch {
          // leave unresolved
        }
      }
    }

    if (!resolved.contractorId && !resolved.subcontractorId) {
      const name = resolved.contractorName || resolved.subcontractorName;
      if (name) {
        const id = await this.resolveEntityId('/api/v1/subcontractors', name, user.token, (c: any) => `${c.name} ${c.code || ''}`);
        if (id) {
          resolved.contractorId = id;
          resolved.subcontractorId = id;
        }
      }
    }

    if (!resolved.employeeId) {
      const name = resolved.employeeName;
      if (name) {
        const id = await this.resolveEntityId('/api/v1/employees', name, user.token, (e: any) => `${e.name} ${e.code || ''}`);
        if (id) resolved.employeeId = id;
      }
    }

    return resolved;
  }

  private async resolveEntityId(
    path: string,
    name: string,
    token: string,
    getName: (item: any) => string,
  ): Promise<string | null> {
    try {
      const data = await this.api.get(path, token);
      const items = data?.data?.items || data?.items || data?.data || [];
      const best = pickBest(items, name, getName);
      return best?.id ?? null;
    } catch {
      return null;
    }
  }

  private updateContext(conversationId: string, toolName: string, data: any): void {
    const setName = (base: string, name: string) => {
      if (name) {
        this.context.set(conversationId, `${base}Name`, name);
        this.context.set(conversationId, `current${base[0].toUpperCase()}${base.slice(1)}Name`, name);
      }
    };

    if ((toolName.includes('find_project') || toolName.includes('list_projects')) && data?.id) {
      this.context.set(conversationId, 'projectId', data.id);
      this.context.set(conversationId, 'currentProjectId', data.id);
      setName('project', data.name || data.code);
    }
    if (toolName.includes('find_contractor') && data?.id) {
      this.context.set(conversationId, 'contractorId', data.id);
      this.context.set(conversationId, 'currentContractorId', data.id);
      setName('contractor', data.name);
    }

    // Remember the last list tool so a "show the full list" follow-up
    // (e.g. "اعرض القائمة كاملة") can be re-run deterministically.
    if ((toolName.startsWith('list_') || toolName.startsWith('show_')) && Array.isArray(data)) {
      this.context.set(conversationId, '_lastListIntent', {
        intent: toolName,
        confidence: 1,
        entities: { entity: 'data' },
        toolName,
        requiredPermissions: undefined,
      });
    }
  }

  private buildResponse(
    message: string,
    conversationId: string,
    intent: string,
    data: any[],
    success: boolean,
  ): AgentResponseDto {
    return {
      success,
      message: sanitizeUuids(message),
      intent,
      conversationId,
      data: data.length ? data : undefined,
    };
  }

  private fallbackUnavailable(
    message: string,
    conversationId: string,
    user: LlmAgentUser,
    intent: string,
  ): AgentResponseDto {
    this.logger.warn(`LLM path unavailable (${intent}) — caller should use the deterministic engine.`);
    return {
      success: false,
      message: '',
      intent,
      conversationId,
      data: undefined,
      metadata: { needsFallback: true },
    } as any;
  }
}
