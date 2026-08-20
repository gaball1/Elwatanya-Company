import { Injectable, Logger } from '@nestjs/common';
import { ChatMessageDto } from './dto/chat.dto';
import { AgentResponseDto, IntentResult, ToolResult } from './dto/agent-response.dto';
import { PlannerService } from './planner/planner.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import { ContextEngineService } from './context/context-engine.service';
import { ConversationMemoryService } from './memory/conversation-memory.service';
import { PermissionCheckerService } from './permissions/permission-checker.service';
import { ErpKnowledgeService } from './knowledge/erp-knowledge.service';
import { WorkflowRegistryService } from './workflows/workflow-registry.service';
import { ChainExecutorService } from './chaining/chain-executor.service';
import { SelfEvaluationService } from './evaluation/self-evaluation.service';
import { ConversationService } from './nl/conversation.service';
import { AgentHttpClient } from './tools/http-client';
import { AgentAnalyticsService } from './analytics/agent-analytics.service';
import { LlmAgentService } from './llm/llm-agent.service';
import { AuditService } from '../audit/audit.service';
import { BaseWorkflow, WorkflowState } from './workflows/base.workflow';
import { sanitizeUuids, pickBest } from './tools/resolution.utils';
import { v4 as uuidv4 } from 'uuid';

const WHY_ANALYSIS_MAP: Record<string, { tools: string[]; message: string }> = {
  'why_project_delayed': {
    tools: ['list_projects', 'project_summary'],
    message: 'Let me check the project status and timelines to understand the delay.',
  },
  'why_treasury_low': {
    tools: ['fund_summary', 'list_project_funds', 'list_payments'],
    message: 'I will analyze the treasury transactions to identify the cause.',
  },
  'why_purchase_increasing': {
    tools: ['list_purchases', 'list_suppliers', 'purchase_analysis'],
    message: 'Let me review purchase trends and supplier activity.',
  },
  'why_inventory_below_threshold': {
    tools: ['inventory_summary', 'list_inventory_items'],
    message: 'Checking inventory levels and identifying low-stock items.',
  },
  'why_contractor_poor_performance': {
    tools: ['list_subcontractors', 'list_extracts'],
    message: 'I will evaluate contractor performance across projects.',
  },
};

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly planner: PlannerService,
    private readonly tools: ToolRegistryService,
    private readonly context: ContextEngineService,
    private readonly memory: ConversationMemoryService,
    private readonly permissions: PermissionCheckerService,
    private readonly knowledge: ErpKnowledgeService,
    private readonly workflows: WorkflowRegistryService,
    private readonly chain: ChainExecutorService,
    private readonly evaluation: SelfEvaluationService,
    private readonly conversation: ConversationService,
    private readonly api: AgentHttpClient,
    private readonly analytics: AgentAnalyticsService,
    private readonly llmAgent: LlmAgentService,
    private readonly audit: AuditService,
  ) {}

  async processMessage(
    dto: ChatMessageDto,
    user: { sub: string; email: string; permissions: string[]; role: string; token: string },
  ): Promise<AgentResponseDto> {
    const conversationId = dto.conversationId || uuidv4();

    await this.memory.add(conversationId, { role: 'user', message: dto.message, timestamp: new Date() }, user.sub);
    if (dto.context) this.context.update(conversationId, dto.context as any);
    this.context.enrichFromHistory(conversationId, dto.message);
    this.resolveEntitiesFromMessage(conversationId, dto.message);

    // Check for active workflow first
    if (this.workflows.hasActiveWorkflow(conversationId)) {
      return this.resumeWorkflow(conversationId, dto, user);
    }

    // Follow-up "show the full list" (e.g. "اعرض القائمة الكاملة") after a list
    // offer re-runs the last list tool and forces the formatter to print every
    // item instead of offering a follow-up question again.
    const lastListIntent = (this.context.get(conversationId) as any)._lastListIntent as IntentResult | undefined;
    const wantsFullList = !!lastListIntent && this.isShowFullListConfirmation(dto.message);
    this.context.set(conversationId, '_showFullList', wantsFullList ? true : undefined);
    if (wantsFullList && lastListIntent) {
      this.logger.log(`Full-list confirmation — re-running ${lastListIntent.intent}`);
      this.analytics.trackRequest(lastListIntent.intent);
      return this.executeSingleTool({ ...lastListIntent }, conversationId, dto, user);
    }

    // LLM-first: when a provider is configured, let the model choose and
    // execute tools against real ERP data. Falls back to the deterministic
    // planner when no key is present or the call fails.
    if (this.llmAgent.isAvailable()) {
      const history = (await this.memory.getHistory(conversationId)).slice(0, -1);
      this.analytics.trackRequest('llm');
      const llmResponse = await this.llmAgent.process(dto.message, conversationId, user, history);
      if (!(llmResponse as any)?.metadata?.needsFallback) {
        await this.memory.add(
          conversationId,
          {
            role: 'assistant',
            message: llmResponse.message,
            timestamp: new Date(),
            intent: llmResponse.intent,
            toolResults: llmResponse.data,
          },
          undefined,
        );
        return llmResponse;
      }
      this.logger.warn('LLM path failed — falling back to deterministic engine');
    }

    const intent = this.planner.classify(dto.message, this.context.getAll(conversationId));
    this.logger.log(`Intent: ${intent.intent} (confidence: ${intent.confidence})`);
    this.analytics.trackRequest(intent.intent);

    // Low confidence
    if (intent.confidence < 0.4) {
      const ar = this.isArabicText(dto.message);
      const summary = this.knowledge.getSummary();
      return this.buildResponse(
        true,
        ar
          ? `لم أفهم تماماً ما تقصده. يمكنني أن أشرح لك هذه الموضوعات في النظام:\n${summary}\n\nفقط اسأل مثل: "اشرح ليه البنود" أو "ازاي بيمشي المستخلص؟"`
          : `I'm not sure what you're asking. ${summary}`,
        'unknown',
        conversationId,
        null,
        null,
      );
    }

    // WHY questions → chain analysis
    if (intent.intent.startsWith('why_')) {
      return this.handleWhyQuestion(intent, conversationId, user, dto.message);
    }

    // Chain detection
    const chainPlan = this.planner.detectChain(dto.message);
    if (chainPlan && chainPlan.confidence >= 0.6 && !intent.requiresWorkflow) {
      return this.handleChain(chainPlan.chainKey, conversationId, dto, user);
    }

    // Knowledge queries
    if (intent.intent.startsWith('explain')) {
      const topic = intent.entities?.entity || intent.entities?.topic || dto.message;
      const explanation = this.knowledge.explain(topic, this.isArabicText(dto.message) ? 'ar' : 'en');
      return this.buildResponse(true, explanation, intent.intent, conversationId, null, null);
    }

    // Workflows
    if (intent.requiresWorkflow || intent.intent.startsWith('workflow_')) {
      return this.startWorkflow(intent, conversationId, dto, user);
    }

    // Follow-up requirement
    if (intent.requiresFollowUp) {
      return this.buildResponse(true, intent.followUpQuestion!, intent.intent, conversationId, null, { requiresFollowUp: true, followUpQuestion: intent.followUpQuestion });
    }

    // Single tool execution
    if (intent.toolName) {
      return this.executeSingleTool(intent, conversationId, dto, user);
    }

    // Generic fallback
    const ar = this.isArabicText(dto.message);
    const entity = intent.entities?.entity || 'data';
    const fallback = ar
      ? `فهمت أنك تريد العمل مع "${entity}". كيف يمكنني مساعدتك في ذلك؟`
      : `I understood you want to work with "${entity}". How can I help you with that?`;
    return this.buildResponse(true, fallback, intent.intent, conversationId, null, null);
  }

  private async executeSingleTool(
    intent: IntentResult,
    conversationId: string,
    dto: ChatMessageDto,
    user: { sub: string; permissions: string[]; role: string; token: string },
  ): Promise<AgentResponseDto> {
    // Permissions check
    if (intent.requiredPermissions?.length) {
      const missing = this.permissions.getMissingPermissions(user.permissions, intent.requiredPermissions);
      if (missing.length > 0) {
        const ar = this.isArabicText(dto.message);
        return this.buildResponse(
          false,
          ar
            ? `ليس لديك صلاحية: ${missing.join('، ')}. يرجى التواصل مع المسؤول لتفعيل الصلاحيات.`
            : `You don't have permission: ${missing.join(', ')}. Contact your administrator.`,
          intent.intent,
          conversationId,
          null,
          null,
        );
      }
    }

    const tool = this.tools.get(intent.toolName!);
    if (!tool) {
      return this.buildResponse(false, `Tool "${intent.toolName}" not found.`, intent.intent, conversationId, null, null);
    }

    try {
      const args: Record<string, any> = { ...intent.entities, intent: intent.intent, ...this.context.getAll(conversationId) };
      this.extractArgsFromMessage(dto.message, args);
      await this.resolveProjectIdIfNeeded(args, { ...user, token: user.token });

      const result = await tool.execute(args, { ...user, token: user.token });

      this.analytics.trackToolCall(intent.toolName!, result.success);
      await this.logAudit(user.sub, intent.intent, result, intent.entities);

      if (result.success && result.data) {
        this.updateContextFromResult(conversationId, intent.intent, result.data);
        if (intent.intent.startsWith('list_') || intent.intent.startsWith('show_')) {
          this.context.set(conversationId, '_lastListIntent', intent);
        }
      }

      // Self-evaluation
      const evaluation = this.evaluation.evaluate(intent, result, conversationId, user.permissions, dto.message);

      // Format response via conversation service (natural language, Arabic-aware)
      const lang: 'ar' | 'en' = /[\u0600-\u06FF]/.test(dto.message) ? 'ar' : 'en';
      const message = this.conversation.formatResponse(intent.intent, result, conversationId, evaluation, lang);

      return this.buildResponse(result.success, message, intent.intent, conversationId, result.data, null);
    } catch (error: any) {
      this.logger.error(`Tool error: ${error.message}`, error);
      this.analytics.trackError();
      return this.buildResponse(false, 'I ran into a technical issue. Please try again.', intent.intent, conversationId, null, null);
    }
  }

  private async resolveProjectIdIfNeeded(args: Record<string, any>, user: any): Promise<void> {
    if (args.projectId || args.id) return;
    const name = args.currentProjectName || args.projectName;
    if (!name) return;
    try {
      const data = await this.api.get('/api/v1/projects', user.token);
      const projects = data?.data?.items || data?.data?.projects || data?.data || [];
      const best = pickBest(projects, name, (p: any) => `${p.code} ${p.name}`);
      if (best?.id) {
        args.projectId = best.id;
        args.currentProjectId = best.id;
      }
    } catch {
      // leave unresolved; the tool will report what it needs
    }
  }

  private async ensureProjectIdFromName(conversationId: string, user: any): Promise<void> {
    const context = this.context.getAll(conversationId);
    if (context.projectId || context.currentProjectId) return;
    const name = context.currentProjectName || context.projectName;
    if (!name) return;
    try {
      const data = await this.api.get('/api/v1/projects', user.token);
      const projects = data?.data?.items || data?.data?.projects || data?.data || [];
      const best = pickBest(projects, name, (p: any) => `${p.code} ${p.name}`);
      if (best?.id) {
        this.context.set(conversationId, 'projectId', best.id);
        this.context.set(conversationId, 'currentProjectId', best.id);
      }
    } catch {
      // leave unresolved; the workflow will ask for what it needs
    }
  }

  private async startWorkflow(
    intent: IntentResult,
    conversationId: string,
    _dto: ChatMessageDto,
    user: { sub: string; permissions: string[]; role: string; token: string },
  ): Promise<AgentResponseDto> {
    const workflowName = intent.requiresWorkflow || intent.intent.replace('workflow_', '');
    const workflow = this.workflows.get(workflowName);

    if (!workflow) {
      return this.buildResponse(false, `Workflow "${workflowName}" is not available yet.`, intent.intent, conversationId, null, null);
    }

    const missing = this.permissions.getMissingPermissions(user.permissions, workflow.requiredPermissions);
    if (missing.length > 0) {
      return this.buildResponse(false, `You don't have permission for this workflow. Missing: ${missing.join(', ')}.`, intent.intent, conversationId, null, null);
    }

    await this.ensureProjectIdFromName(conversationId, user);

    // Enrich workflow-specific context from what the user already provided
    this.extractWorkflowArgs(conversationId, _dto.message, workflow);
    const enriched = this.context.getAll(conversationId);
    const remainingMissing = workflow.validateContext(enriched);

    if (remainingMissing.length > 0) {
      this.context.set(conversationId, 'activeWorkflow', workflowName);
      this.context.set(conversationId, 'workflowPhase', workflow.phases[0]?.name || 'starting');
      this.context.set(conversationId, 'workflowStep', 0);
      // Persist an active workflow state so the next user message resumes this
      // workflow instead of being classified as a brand-new request.
      this.workflows.setState(conversationId, workflow.createState(enriched));

      const phaseNames = workflow.phases.map((p) => `  • ${p.description}`).join('\n');
      const fields = remainingMissing.map((f) => `  • ${f}`).join('\n');
      const message = `I'll help you with **${workflow.description}**.\n\n**Phases:**\n${phaseNames}\n\n**I need:**\n${fields}\n\nPlease provide the required information.`;

      return this.buildResponse(true, message, intent.intent, conversationId, null, {
        requiresFollowUp: true,
        followUpQuestion: `Please provide: ${remainingMissing.join(', ')}`,
        workflowState: 'awaiting_input',
        workflowName,
      });
    }

    // Execute workflow
    return this.executeWorkflowSteps(workflow, conversationId, enriched, user, intent);
  }

  private async resumeWorkflow(
    conversationId: string,
    dto: ChatMessageDto,
    user: { sub: string; email?: string; permissions: string[]; role: string; token: string },
  ): Promise<AgentResponseDto> {
    const workflowName = this.workflows.getActiveWorkflowName(conversationId);
    if (!workflowName) {
      return this.processMessage({ ...dto, conversationId }, user as any);
    }

    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      this.workflows.clearState(conversationId);
      return this.buildResponse(false, `Workflow session expired. Please start again.`, '', conversationId, null, null);
    }

    // Update context with any values from the user's message
    this.extractWorkflowArgs(conversationId, dto.message, workflow);
    await this.ensureProjectIdFromName(conversationId, user);

    const context = this.context.getAll(conversationId);

    // Check if there's a failed step to retry
    const failedStepName = context['_workflow_failed_step'];
    if (failedStepName) {
      const failedStep = workflow.steps.find((s) => s.name === failedStepName);
      if (failedStep) {
        this.logger.log(`Retrying workflow step: ${failedStepName}`);
        this.context.set(conversationId, '_workflow_failed_step', undefined);
        this.context.set(conversationId, '_workflow_failed_error', undefined);
        // Re-run the workflow steps — the failed step will be re-attempted
        return this.executeWorkflowSteps(workflow, conversationId, context, user, null);
      }
    }

    const missingFields = workflow.validateContext(context);

    if (missingFields.length > 0) {
      const fields = missingFields.map((f) => `  • ${f}`).join('\n');
      return this.buildResponse(true, `Still need:\n${fields}\n\nPlease provide the required information.`, `workflow_${workflowName}`, conversationId, null, {
        requiresFollowUp: true,
        followUpQuestion: `Please provide: ${missingFields.join(', ')}`,
        workflowState: 'awaiting_input',
        workflowName,
      });
    }

    // Execute
    return this.executeWorkflowSteps(workflow, conversationId, context, user, null);
  }

  private async executeWorkflowSteps(
    workflow: BaseWorkflow,
    conversationId: string,
    context: Record<string, any>,
    user: { sub: string; permissions: string[]; role: string; token: string },
    intent: IntentResult | null,
  ): Promise<AgentResponseDto> {
    const results: ToolResult[] = [];
    let stepIndex = 0;
    const intentName = intent?.intent || `workflow_${workflow.name}`;
    this.analytics.trackWorkflowEvent(workflow.name, 'started');

    while (stepIndex < workflow.steps.length) {
      const next = workflow.getNextStep(stepIndex, context);
      if (!next) break;

      const { step, missingFields } = next;

      if (missingFields.length > 0 && !step.optional) {
        this.context.set(conversationId, 'workflowStep', stepIndex);
        this.context.set(conversationId, 'activeWorkflow', workflow.name);
        const phase = workflow.getPhaseForStep(step.name);
        this.context.set(conversationId, 'workflowPhase', phase || workflow.name);

        const fields = missingFields.map((f) => `  • ${f}`).join('\n');
        return this.buildResponse(true, `To **${step.description}**, I need:\n${fields}\n\nPlease provide the required information.`, intentName, conversationId, { completedSteps: results }, {
          requiresFollowUp: true,
          followUpQuestion: `Please provide: ${missingFields.join(', ')}`,
          workflowState: 'awaiting_input',
          workflowName: workflow.name,
        });
      }

      // Skip optional steps that have missing dependencies
      if (step.optional && missingFields.length > 0) {
        stepIndex++;
        continue;
      }

      // Execute step
      const tool = this.tools.get(step.toolName);
      if (!tool) {
        return this.buildResponse(false, `Step "${step.description}" failed: tool not available.`, intentName, conversationId, { completedSteps: results }, null);
      }

      const stepArgs = typeof step.args === 'function' ? step.args(context) : step.args;
      Object.assign(stepArgs, context);

      try {
        this.logger.log(`Workflow step: ${workflow.name}.${step.name}`);
        const stepResult = await tool.execute(stepArgs, { ...user, token: user.token });
        results.push(stepResult);

        if (!stepResult.success) {
          // Optional steps that fail should be skipped, not pause the workflow
          if (step.optional) {
            this.logger.warn(`Optional workflow step skipped (${step.name}): ${stepResult.error}`);
            stepIndex++;
            continue;
          }
          this.analytics.trackWorkflowEvent(workflow.name, 'failed');
          this.context.set(conversationId, '_workflow_failed_step', step.name);
          this.context.set(conversationId, '_workflow_failed_error', stepResult.error || 'Unknown error');
          return this.buildResponse(false, `Workflow paused at "${step.description}". Please try again.`, intentName, conversationId, { completedSteps: results }, {
            workflowState: 'paused',
            workflowName: workflow.name,
            failedStep: step.name,
          });
        }

        // Store result in context
        if (stepResult.data?.id) {
          this.context.set(conversationId, `_step_${step.name}_id`, stepResult.data.id);
        }

        // Update context with relevant entity IDs
        if (stepResult.data) {
          this.updateContextFromResult(conversationId, step.name, stepResult.data);
        }

        // Refresh the local context so later steps can use IDs resolved by this step
        const liveContext = this.context.getAll(conversationId);
        Object.assign(context, liveContext);

        stepIndex++;
      } catch (error: any) {
        // Optional steps that throw should be skipped, not pause the workflow
        if (step.optional) {
          this.logger.warn(`Optional workflow step errored (${step.name}): ${error.message}`);
          stepIndex++;
          continue;
        }
        this.analytics.trackWorkflowEvent(workflow.name, 'failed');
        this.analytics.trackError();
        this.context.set(conversationId, '_workflow_failed_step', step.name);
        this.context.set(conversationId, '_workflow_failed_error', error.message);
        return this.buildResponse(false, `Workflow error at "${step.description}". Please try again.`, intentName, conversationId, { completedSteps: results }, {
          workflowState: 'failed',
          workflowName: workflow.name,
          failedStep: step.name,
        });
      }
    }

    this.analytics.trackWorkflowEvent(workflow.name, 'completed');

    // Workflow complete
    this.context.set(conversationId, 'activeWorkflow', undefined);
    this.context.set(conversationId, 'workflowPhase', undefined);
    this.context.set(conversationId, 'workflowStep', undefined);
    this.workflows.clearState(conversationId);

    await this.logAudit(user.sub, `workflow_${workflow.name}`, { success: true, data: results }, {});

    const phaseSummary = workflow.phases.map((p) => {
      const phaseSteps = p.steps.filter((s) => results.some((r) => r.success));
      return `✅ ${p.description}: ${phaseSteps.length} step(s) completed`;
    }).join('\n');

    // Structured executive report for workflows that provide one
    let message = `**${workflow.description}** completed successfully.\n\n${phaseSummary}`;
    if (typeof workflow.buildReport === 'function') {
      try {
        message = workflow.buildReport(results, this.context.getAll(conversationId));
      } catch (error: any) {
        this.logger.error(`buildReport failed: ${error.message}`);
      }
    }

    return this.buildResponse(true, message, intentName, conversationId, { steps: results }, null);
  }

  private async handleWhyQuestion(
    intent: IntentResult,
    conversationId: string,
    user: { sub: string; permissions: string[]; role: string; token: string },
    message = '',
  ): Promise<AgentResponseDto> {
    const ar = this.isArabicText(message);
    const analysis = WHY_ANALYSIS_MAP[intent.intent];
    if (!analysis) {
      return this.buildResponse(
        true,
        ar
          ? 'سؤال جيد. دعني أحلل البيانات المتاحة للوصول إلى إجابة — سأفحص حالة المشاريع والوضع المالي والمؤشرات التشغيلية.'
          : `That's a good question. Let me analyze the available data to find the answer. I'll check project status, financials, and operational metrics.`,
        intent.intent,
        conversationId,
        null,
        null,
      );
    }

    // Execute chain of analysis tools
    const chainPlan = this.chain.detectChain(analysis.message, intent.entities, this.context.getAll(conversationId));
    if (chainPlan) {
      const { results, context: chainCtx } = await this.chain.executeChain(chainPlan, conversationId, user);
      const successful = results.filter((r) => r.success);

      if (successful.length === 0) {
        return this.buildResponse(
          false,
          ar
            ? 'لم أتمكن من الحصول على بيانات كافية للإجابة على سؤالك. يرجى التحقق من الصلاحيات أو المحاولة لاحقاً.'
            : `I was unable to retrieve enough data to answer your question. Please check your permissions or try again later.`,
          intent.intent,
          conversationId,
          null,
          null,
        );
      }

      // Build reasoning from results
      const reasoning = this.buildWhyReasoning(intent.intent, successful, ar);
      return this.buildResponse(true, reasoning, intent.intent, conversationId, { analysis: results }, null);
    }

    return this.buildResponse(true, ar ? this.whyArabicFallback(intent.intent) : analysis.message, intent.intent, conversationId, null, null);
  }

  private whyArabicFallback(intent: string): string {
    const map: Record<string, string> = {
      why_project_delayed: 'سأفحص حالة المشاريع والجداول الزمنية لفهم سبب التأخير.',
      why_treasury_low: 'سأحلل حركة الخزنة والصناديق لتحديد السبب.',
      why_purchase_increasing: 'سأراجع اتجاهات المشتريات ونشاط الموردين.',
      why_inventory_below_threshold: 'سأفحص مستويات المخزون وتحديد الأصناف الأقل من الحد الأدنى.',
      why_contractor_poor_performance: 'سأقيّم أداء المقاولين عبر المشاريع.',
    };
    return map[intent] || 'دعني أبحث في البيانات المتاحة للإجابة على سؤالك.';
  }

  private async handleChain(
    chainKey: string,
    conversationId: string,
    _dto: ChatMessageDto,
    user: { sub: string; permissions: string[]; role: string; token: string },
  ): Promise<AgentResponseDto> {
    const chainPlan = this.chain.detectChain(chainKey, {}, this.context.getAll(conversationId));
    if (!chainPlan) {
      return this.buildResponse(false, `I couldn't determine the analysis needed. Could you be more specific?`, 'chain', conversationId, null, null);
    }

    const { results, context: chainCtx } = await this.chain.executeChain(chainPlan, conversationId, user);
    const successful = results.filter((r) => r.success);

    if (successful.length === 0) {
      return this.buildResponse(false, `Analysis failed. Unable to retrieve the required data.`, 'chain', conversationId, null, null);
    }

    const summary = this.conversation.formatResponse('chain_analysis', { success: true, data: chainCtx }, conversationId);

    return this.buildResponse(true, summary, 'chain_analysis', conversationId, { steps: results }, null);
  }

  private buildWhyReasoning(intent: string, results: ToolResult[], ar = false): string {
    const raw = results[0]?.data || {};
    // The delayed_project_impact chain runs list_projects first, which returns
    // a bare array. Normalize it into the same shape project_summary provides
    // so the counts below are real numbers, never "0 projects".
    const data = Array.isArray(raw)
      ? {
          total: raw.length,
          active: raw.filter((p: any) => p.status === 'active').length,
          completed: raw.filter((p: any) => p.status === 'completed').length,
          onHold: raw.filter(
            (p: any) => String(p.status || '').toLowerCase().replace('-', '_') === 'on_hold',
          ).length,
        }
      : raw;

    if (ar) {
      switch (intent) {
        case 'why_project_delayed': {
          const total = data.total || 0;
          const onHold = data.onHold || 0;
          const completed = data.completed || 0;
          const active = data.active || 0;
          if (total === 0) return 'لا توجد مشاريع لتحليلها.';
          if (onHold > 0) return `من إجمالي ${total} مشروع، يوجد ${onHold} متوقف. قد يكون التأخير ناتجاً عن توزيع الموارد أو اختناقات الموافقات أو مشاكل سلسلة التوريد. أنصح بمراجعة المشاريع المتوقفة لتحديد المعوقات.`;
          return `يوجد ${total} مشروع (${active} نشط، ${completed} مكتمل). لا توجد مشاريع مصنفة كمتأخرة حالياً.`;
        }
        case 'why_treasury_low': {
          const remaining = data.remaining;
          if (remaining !== undefined) {
            if (remaining <= 0) return 'تم استهلاك الخزنة بالكامل. تم إنفاق كل الميزانية على الصناديق. قد تحتاج إلى طلب تخصيص ميزانية إضافية.';
            return `الرصيد المتبقي في الخزنة هو ${remaining}. قد يكون منخفضاً بسبب أوامر الشراء الأخيرة أو دفعات المقاولين أو مصروفات غير مخطط لها. أنصح بمراجعة حركات الصناديق الأخيرة.`;
          }
          return 'تعذر تحديد حالة الخزنة.';
        }
        case 'why_purchase_increasing': {
          return 'قد تكون المشتريات مرتفعة بسبب مراحل المشاريع النشطة التي تتطلب مواد أكثر. أنصح بمراجعة أوامر الشراء لكل مشروع لتحديد الاتجاهات.';
        }
        case 'why_inventory_below_threshold': {
          const lowStock = data.lowStock || 0;
          const totalItems = data.totalItems || 0;
          if (lowStock === 0) return 'مستويات المخزون مناسبة. لا توجد أصناف أقل من الحد الأدنى.';
          return `${lowStock} من أصل ${totalItems} صنف أقل من الحد الأدنى للمخزون. قد يكون السبب زيادة استهلاك المشاريع أو تأخر تسليم الموردين أو نقص التخطيط لإعادة الطلب.`;
        }
        case 'why_contractor_poor_performance': {
          return 'تقييم أداء المقاولين يتطلب مراجعة تاريخ المستخلصات والجداول الزمنية وسجلات الجودة. بناءً على البيانات المتاحة، أنصح بمراجعة تفصيلية لمستخلصات كل مقاول ومعالم المشروع.';
        }
        default:
          return 'بناءً على التحليل، توجد عدة عوامل مؤثرة. أنصح بمراجعة البيانات التفصيلية للحصول على صورة كاملة.';
      }
    }

    switch (intent) {
      case 'why_project_delayed': {
        const total = data.total || 0;
        const onHold = data.onHold || 0;
        const completed = data.completed || 0;
        const active = data.active || 0;
        if (total === 0) return 'There are no projects to analyze.';
        if (onHold > 0) return `Out of ${total} projects, ${onHold} are on hold. Delays may be caused by resource allocation, approval bottlenecks, or supply chain issues. I recommend reviewing the on-hold projects to identify blockers.`;
        return `There are ${total} projects (${active} active, ${completed} completed). No projects are currently marked as delayed.`;
      }
      case 'why_treasury_low': {
        const remaining = data.remaining;
        if (remaining !== undefined) {
          if (remaining <= 0) return `The treasury has been fully utilized. All budget has been spent across project funds. You may need to request additional budget allocation.`;
          return `The remaining treasury balance is ${remaining}. This may be low due to recent purchase orders, contractor payments, or unplanned expenses. I recommend reviewing the recent fund transactions for details.`;
        }
        return 'Unable to determine treasury status.';
      }
      case 'why_purchase_increasing': {
        return 'Purchase volumes may be increasing due to active project phases requiring more materials. I recommend reviewing purchase orders by project to identify trends.';
      }
      case 'why_inventory_below_threshold': {
        const lowStock = data.lowStock || 0;
        const totalItems = data.totalItems || 0;
        if (lowStock === 0) return 'Inventory levels are adequate. No items are currently below their minimum threshold.';
        return `${lowStock} out of ${totalItems} inventory items are below minimum stock levels. This may be due to increased project consumption, delayed supplier deliveries, or inadequate reorder planning.`;
      }
      case 'why_contractor_poor_performance': {
        return 'Contractor performance evaluation requires reviewing extract history, project timelines, and quality records. Based on available data, I recommend a detailed review of each contractor\'s extract submissions and project milestones.';
      }
      default:
        return 'Based on the analysis, there are multiple factors at play. I recommend reviewing the detailed data for a complete picture.';
    }
  }

  private extractWorkflowArgs(conversationId: string, message: string, workflow: BaseWorkflow): void {
    const context = this.context.getAll(conversationId);

    // Follow-delimiter shared by the value captures below: stop at commas,
    // "and"/"or", the end of the message, or the next field keyword so values
    // can be parsed even when the user does not separate them with commas.
    const stop = '(?:\\s*,\\s*|\\s+and\\s+|\\s+or\\s+|\\s*$|\\.|\\s+(?:phone|location|date|budget|client|code|type|status)\\b)';

    const clientMatch = message.match(new RegExp(`client\\s+(?:is\\s+)?["']?([^"'\n,]+?)["']?${stop}`, 'i'));
    if (clientMatch && workflow.getRequiredFields().includes('clientName') && !context.clientName) {
      context.clientName = clientMatch[1].trim();
    }

    const nameMatch = message.match(new RegExp(`(project|building|employee)\\s+(name\\s+)?(is\\s+)?["']?([^"'\n,]+?)["']?${stop}`, 'i'));
    if (nameMatch) {
      const kind = nameMatch[1].toLowerCase();
      const val = nameMatch[4].trim();
      // A bare "project X" mention only fills the value when it isn't already
      // known, but an explicit "X name is ..." always wins so it can overwrite
      // a fragment ("name") picked up by resolveEntitiesFromMessage.
      const explicit = !!nameMatch[2];
      if (kind === 'project' && (explicit || !context.projectName)) context.projectName = val;
      else if (kind === 'building' && (explicit || !context.buildingName)) context.buildingName = val;
      else if (kind === 'employee' && (explicit || !context.employeeName)) context.employeeName = val;
    }

    const locationMatch = message.match(new RegExp(`location\\s+(?:is\\s+)?["']?([^"'\n,]+?)["']?${stop}`, 'i'));
    if (locationMatch && !context.projectLocation) context.projectLocation = locationMatch[1].trim();

    const dateMatch = message.match(/(?:start\s+)?date\s+(?:is\s+)?["']?(\d{4}-\d{2}-\d{2})["']?/i);
    if (dateMatch && !context.projectStartDate) context.projectStartDate = dateMatch[1];

    const budgetMatch = message.match(/budget\s+(?:is\s+)?["']?(\d+)["']?/i);
    if (budgetMatch && !context.projectBudget) context.projectBudget = budgetMatch[1];

    const phoneMatch = message.match(/phone\s+(?:is\s+)?["']?(\d+)["']?/i);
    if (phoneMatch && !context.employeePhone) context.employeePhone = phoneMatch[1];

    const qtyMatch = message.match(/(\d+)\s*(piece|kg|m2|unit|liter|meter|m|box)/i);
    if (qtyMatch) {
      if (!context.quantity) context.quantity = qtyMatch[1];
      if (!context.unit) context.unit = qtyMatch[2].toLowerCase();
    }

    const priceMatch = message.match(/price\s+(?:is\s+)?(\d+)/i);
    if (priceMatch && !context.unitPrice) context.unitPrice = priceMatch[1];

    const uuids = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
    if (uuids) {
      if (!context.projectId) context.projectId = uuids[0];
      if (!context.buildingId && uuids[1]) context.buildingId = uuids[1];
    }

    // Persist back into the engine: getAll() returns a copy, so extracted
    // values must be written through here to survive to the next turn/step.
    this.context.update(conversationId, context);
  }

  private isArabicText(text: string): boolean {
    return /[\u0600-\u06FF]/.test(text || '');
  }

  /**
   * Detect a follow-up that confirms showing the full list after the agent
   * offered one ("وجدت 11 مقاول. هل تريد أن أعرض لك القائمة كاملة؟").
   * Messages that name a specific entity ("اعرض قائمة المقاولين الكاملة") are
   * NOT treated as confirmations — the normal planner handles those.
   */
  private isShowFullListConfirmation(message: string): boolean {
    const lower = message.toLowerCase().trim();
    const explicitEntity = /(مقاول|مورد|عميل|موظف|مشتريات|مستخلص|مخزن|صناديق|صندوق|بنود|بند|مشروع|مشاريع|مخزون|اصناف|أصناف|building|project|purchase|subcontractor|supplier|client|employee|extract|payment|inventory|fund|warehouse|item|product)/.test(lower);
    if (explicitEntity) return false;

    // Arabic: "اعرض القائمة كاملة" / "القائمة كلها" / "الكل" + a show verb
    if (/(القائمه|القائمة|الليست|قائمة|قائمه)/.test(lower)) {
      if (/(كامله|كاملة|الكامله|الكاملة|بالكامل|بكامل|كلها|كلهم|الكل|جميع)/.test(lower)) return true;
    }
    if (/(الكل|كلهم|كلها|جميع|كلهم)/.test(lower) &&
        /(اعرض|وريني|ورينى|عرض|اديني|ادينى|جيب|اكشف|اظهر|أظهر|شوف|عايز|عايزة|ممكن)/.test(lower)) return true;

    // Short Arabic confirmations after a list offer
    if (/^(نعم|تمام|ايوه|أيوه|ايوة|اه|آه|اكيد|أكيد|طبعا|طيب|خلاص|اوكي|أوكي|موافق|براحتك|عرضهم|وريهم|اوريهم|أوريهم|شوفهم)$/.test(lower)) return true;

    // English: "show the full list" / "show all" / "all of them"
    if (/\b(show|display|get)\b.*\b(full|complete|all|entire)\b.*\blist\b/.test(lower)) return true;
    if (/\bshow all\b|\ball of them\b|\bfull list\b|\bcomplete list\b|\bthe whole list\b/.test(lower)) return true;

    return false;
  }

  private extractArgsFromMessage(message: string, args: Record<string, any>): void {
    const lower = message.toLowerCase();
    const nameMatch = message.match(/(?:called|named|name\s+is)\s+"([^"]+)"|"([^"]+)"/);
    if (nameMatch) args.name = nameMatch[1] || nameMatch[2];
    const statusMatch = lower.match(/(active|completed|on_hold|pending|approved|rejected|draft|cancelled)/);
    if (statusMatch) args.status = statusMatch[1];
    const arabicStatusMap: Record<string, string> = {
      'المعلقة': 'pending', 'المعلقه': 'pending', 'معلقة': 'pending', 'معلقه': 'pending',
      'قيد المراجعة': 'pending', 'قيد الانتظار': 'pending',
      'المعتمدة': 'approved', 'المعتمد': 'approved', 'معتمدة': 'approved', 'معتمد': 'approved',
      'المرفوضة': 'rejected', 'المرفوضه': 'rejected', 'مرفوض': 'rejected', 'مرفوضة': 'rejected',
      'المكتملة': 'completed', 'المكتمله': 'completed', 'مكتملة': 'completed', 'مكتمله': 'completed',
      'الملغية': 'cancelled', 'الملغيه': 'cancelled', 'ملغي': 'cancelled', 'ملغيه': 'cancelled',
      'النشطة': 'active', 'النشطه': 'active', 'نشط': 'active', 'نشطة': 'active', 'نشطه': 'active',
    };
    for (const [kw, st] of Object.entries(arabicStatusMap)) {
      if (lower.includes(kw)) {
        args.status = st;
        break;
      }
    }
    const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) {
      if (!args.projectId) args.projectId = uuidMatch[0];
      else if (!args.buildingId) args.buildingId = uuidMatch[0];
    }

    // Approval request: extract entityType + entityId so create_approval / list_pending_approvals can target the right entity
    const approvalEntityMap: Record<string, string> = {
      inventory: 'inventory', stock: 'inventory', مخزون: 'inventory',
      purchase: 'purchase', purchases: 'purchase', مشتريات: 'purchase',
      extract: 'extract', extracts: 'extract', خلاصة: 'extract', مستخلص: 'extract',
      leave: 'leave', إجازة: 'leave',
      'fund transaction': 'fund-transaction', 'fund-transaction': 'fund-transaction',
      'client statement': 'client-statement', 'client-statement': 'client-statement',
      'subcontractor statement': 'subcontractor-statement', 'subcontractor-statement': 'subcontractor-statement',
    };
    if (args.entity === 'approval' || args.intent === 'create_approval' || args.intent === 'list_pending_approvals' || args.intent === 'approve_request' || args.intent === 'reject_request') {
      for (const [keyword, entityType] of Object.entries(approvalEntityMap)) {
        if (lower.includes(keyword)) {
          args.entityType = entityType;
          break;
        }
      }
      const entityUuid = message.match(/(?:item|inventory|purchase|extract|leave|entity|request|for)\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (entityUuid) {
        args.entityId = entityUuid[1];
        if (!args.approvalId && args.intent === 'approve_request' || args.intent === 'reject_request') {
          args.approvalId = entityUuid[1];
        }
      }
    }
  }

  /**
   * Pre-pass: detect project/contractor mentions in the raw message and store
   * them in conversation context so tools and workflows can auto-resolve
   * entities without asking the user for IDs.
   */
  private resolveEntitiesFromMessage(conversationId: string, message: string): void {
    // Project code mention (e.g. NCM-2026)
    const codeMatch = message.match(/\b([A-Z]{2,6}-\d{2,4})\b/);
    if (codeMatch) {
      const code = codeMatch[1].toUpperCase();
      this.context.set(conversationId, 'currentProjectName', code);
      this.context.set(conversationId, 'projectName', code);
    }

    // "project X" mention (skip "project name is ..." — that pattern is handled
    // by extractWorkflowArgs, which would otherwise be blocked by this fragment)
    const projectMention = this.extractNameAfter(message, /(?:project|مشروع)\s+/i);
    if (projectMention && !codeMatch && !/^name\b/i.test(projectMention)) {
      this.context.set(conversationId, 'currentProjectName', projectMention);
      this.context.set(conversationId, 'projectName', projectMention);
    }

    // Building name mention: "building X", "مبنى X", "عمارة X"
    const buildingMention = this.extractNameAfter(message, /(?:building|مبنى|مبني|عماره|عمارة|برج)\s+/i);
    if (buildingMention) {
      this.context.set(conversationId, 'currentBuildingName', buildingMention);
      this.context.set(conversationId, 'buildingName', buildingMention);
    }

    // Warehouse name mention: "warehouse X", "مخزن X"
    const warehouseMention = this.extractNameAfter(message, /(?:warehouse|مخزن)\s+/i);
    if (warehouseMention) {
      this.context.set(conversationId, 'currentWarehouseName', warehouseMention);
      this.context.set(conversationId, 'warehouseName', warehouseMention);
    }

    // Supplier name mention: "supplier X", "مورد X"
    const supplierMention = this.extractNameAfter(message, /(?:supplier|مورد)\s+/i);
    if (supplierMention) {
      this.context.set(conversationId, 'currentSupplierName', supplierMention);
      this.context.set(conversationId, 'supplierName', supplierMention);
    }

    // Item mention from Arabic "where is X" (e.g. "فين الحديد") or "المخزن فيه X كام"
    const itemMention = message.match(/(?:فين|اين|وين)\s+(.+)|(?:المخزن|المخزون|مخزن|مخزون|المخازن|مخازن).*(?:فيه|فية|فيا)\s+(.+)/i);
    if (itemMention) {
      const name = this.cleanNameFragment((itemMention[1] || itemMention[2] || '').replace(/[؟?]+$/, ''));
      if (name) {
        this.context.set(conversationId, 'currentItemName', name);
        this.context.set(conversationId, 'itemName', name);
      }
    }

    // Contractor name mention: "contractor X", "subcontractor X", "المقاول X", "مقاولات X", "مقاول X"
    const contractorKeyword = message.match(/(?:contractor|subcontractor|المقاول|مقاولات|مقاول)\s+/i);
    if (contractorKeyword) {
      const rest = message.slice(contractorKeyword.index! + contractorKeyword[0].length);
      const name = this.cleanNameFragment(rest);
      if (name && !/^(extracts?|payments?|dues|balance|paid|payment|list|show|get|find|view|display|the|a|an)$/i.test(name)) {
        // Keep both keys in sync so a freshly-mentioned name always wins over
        // a stale value left by a previous turn.
        this.context.set(conversationId, 'currentContractorName', name);
        this.context.set(conversationId, 'contractorName', name);
      }
    }
  }

  private extractNameAfter(message: string, keyword: RegExp): string | null {
    const m = message.match(keyword);
    if (!m) return null;
    return this.cleanNameFragment(message.slice(m.index! + m[0].length));
  }

  private cleanNameFragment(fragment: string): string {
    const stopWords = [
      'extract', 'extracts', 'payment', 'payments', 'paid', 'unpaid', 'dues', 'balance',
      'show', 'list', 'get', 'find', 'display', 'view', 'the', 'a', 'an', 'is', 'are',
      'was', 'has', 'had', 'in', 'on', 'for', 'at', 'of', 'and', 'with', 'his', 'her',
      'their', 'been', 'being', 'project', 'projects', 'building', 'buildings',
      'approx', 'approximately', 'about', 'مستخلص', 'مستخلصات', 'دفعات', 'مدفوع',
      // Arabic / Egyptian dialect
      'المشروع', 'مشروع', 'مشاريع', 'مبنى', 'مبني', 'عماره', 'عمارة', 'مباني', 'مبانى',
      'المقاول', 'مقاول', 'المورد', 'المخزن', 'مخزن',
      'عمل', 'عملت', 'عامل', 'كام', 'كم', 'فين', 'فيها', 'عندك', 'باقي', 'باقيه', 'المتبقي',
      'مستحق', 'مستحقات', 'رصيد', 'مديونيه', 'ليه', 'لماذا', 'ازاي', 'ازاى', 'عايز',
      'ده', 'دي', 'دا', 'دى', 'ذات', 'اللي', 'اللى', 'بتاع', 'بتاعة', 'هو', 'هي',
      'عملهم', 'بيدفع', 'استلم', 'استخلص', 'اعمل', 'ممكن', 'عشان', 'علشان', 'الخاص',
      'بتاعه', 'الحمد', 'طيب', 'تم', 'فقط', 'لكل', 'من', 'في', 'عن', 'علي', 'على',
      'الي', 'التي', 'الذى', 'الذي', 'بشأن', 'بخصوص', 'مصري', 'جديد',
    ];
    const words: string[] = [];
    for (const word of fragment.split(/\s+/)) {
      const clean = word.replace(/[.,!?;:'"”’()،؛؟]/g, '');
      if (!clean) continue;
      if (stopWords.includes(clean.toLowerCase())) break;
      words.push(clean);
      if (word.match(/[.!?؟؛،]/)) break;
    }
    return words.join(' ').trim();
  }

  private updateContextFromResult(conversationId: string, intent: string, data: any): void {
    if (!data) return;

    const setName = (base: string, name: string) => {
      if (name) {
        this.context.set(conversationId, `${base}Name`, name);
        this.context.set(conversationId, `current${base[0].toUpperCase()}${base.slice(1)}Name`, name);
      }
    };

    // Project resolution
    if (intent.includes('find_project') || intent.includes('list_projects') || intent === 'get_project' || data?.code && data?.name && !data?.items) {
      if (data.id) {
        this.context.set(conversationId, 'projectId', data.id);
        this.context.set(conversationId, 'currentProjectId', data.id);
        setName('project', data.name || data.code);
      }
    }

    // Building resolution
    if (intent.includes('find_building') || intent.includes('list_buildings') || intent.includes('list_project_buildings') || data?.projectName && Array.isArray(data.items)) {
      if (Array.isArray(data.items)) {
        this.context.set(conversationId, '_buildings', data.items);
        if (data.items.length === 1 && data.items[0].id) {
          this.context.set(conversationId, 'buildingId', data.items[0].id);
          this.context.set(conversationId, 'currentBuildingId', data.items[0].id);
          setName('building', data.items[0].name);
        }
      } else if (data.id) {
        this.context.set(conversationId, 'buildingId', data.id);
        this.context.set(conversationId, 'currentBuildingId', data.id);
        setName('building', data.name);
      }
    }

    // Contractor resolution
    const contractorCandidate = data.contractor && data.contractor.id ? data.contractor : null;
    if (
      intent.includes('find_contractor') ||
      intent.includes('contractor') ||
      (data?.name && data?.workType !== undefined) ||
      contractorCandidate
    ) {
      const c = contractorCandidate || data;
      if (c.id) {
        this.context.set(conversationId, 'contractorId', c.id);
        this.context.set(conversationId, 'currentContractorId', c.id);
        setName('contractor', c.name);
      }
    }

    // Extract list
    if (intent.includes('list_contractor_extracts') || intent.includes('list_extracts') || intent.includes('find_extract') || Array.isArray(data.items) && data.totalNetPayable !== undefined) {
      this.context.set(conversationId, '_extracts', data.items || []);
      // Only the "current" key is stored so a stale short-form id never leaks
      // into a later tool call as a filter (e.g. payments filtered by extract).
      if (data.items?.[0]?.id) {
        this.context.set(conversationId, 'currentExtractId', data.items[0].id);
      }
    }

    // Payments
    if (intent.includes('list_extract_payments') || intent.includes('list_payments') || Array.isArray(data.items) && data.totalPaid !== undefined) {
      this.context.set(conversationId, '_payments', data.items || []);
      if (data.items?.[0]?.id) this.context.set(conversationId, 'currentPaymentId', data.items[0].id);
    }

    // Approvals
    if (intent.includes('list_extract_approvals') || data?.extractIds) {
      this.context.set(conversationId, '_approvals', data.items || []);
    }

    // Dues
    if (intent.includes('get_contractor_dues') || data?.summary) {
      this.context.set(conversationId, '_dues', data);
    }
  }

  private async buildResponse(
    success: boolean,
    message: string,
    intent: string,
    conversationId: string,
    data: any,
    extra: Record<string, any> | null,
  ): Promise<AgentResponseDto> {
    // Never surface raw UUIDs to the user — use names/codes/references instead.
    const safeMessage = sanitizeUuids(message);
    const response: AgentResponseDto = { success, message: safeMessage, intent, conversationId, data };
    if (extra) Object.assign(response, extra);
    await this.memory.add(
      conversationId,
      { role: 'assistant', message: safeMessage, timestamp: new Date(), intent, toolResults: data ? [data] : undefined },
      undefined,
    );
    return response;
  }

  private async logAudit(userId: string, action: string, result: ToolResult | { success: boolean; data?: any }, metadata: any): Promise<void> {
    await this.audit.log({
      userId,
      action: `AI_AGENT_${action.toUpperCase()}`,
      entity: 'ai-agent',
      entityId: userId,
      metadata: { success: result.success, action, ...metadata },
    });
  }
}
