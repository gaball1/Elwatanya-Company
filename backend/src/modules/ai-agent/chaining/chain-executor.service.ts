import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { ContextEngineService } from '../context/context-engine.service';
import { ToolResult } from '../dto/agent-response.dto';
import { IntentResult } from '../dto/agent-response.dto';

export interface ChainStep {
  toolName: string;
  args: Record<string, any>;
  description: string;
  preserveOutput?: string[]; // context keys to copy from result
}

export interface ChainPlan {
  steps: ChainStep[];
  description: string;
  confidence: number;
}

// Pre-defined chain patterns for complex queries
const CHAIN_PATTERNS: Record<string, (entities: Record<string, any>, context: Record<string, any>) => ChainPlan> = {
  delayed_project_impact: (entities, ctx) => ({
    steps: [
      { toolName: 'list_projects', args: {}, description: 'Fetch all projects', preserveOutput: ['projects'] },
      { toolName: 'project_summary', args: {}, description: 'Get project summary counts', preserveOutput: ['summary'] },
    ],
    description: 'Analyzing delayed projects and their financial impact',
    confidence: 0.85,
  }),

  contractor_performance: (entities, ctx) => ({
    steps: [
      { toolName: 'list_subcontractors', args: {}, description: 'Fetch subcontractor list', preserveOutput: ['subcontractors'] },
      { toolName: 'list_extracts', args: {}, description: 'Get extract history for contractor evaluation', preserveOutput: ['extracts'] },
    ],
    description: 'Evaluating contractor performance across projects',
    confidence: 0.8,
  }),

  treasury_analysis: (entities, ctx) => ({
    steps: [
      { toolName: 'fund_summary', args: {}, description: 'Get treasury/fund summary', preserveOutput: ['fundSummary'] },
      { toolName: 'list_project_funds', args: {}, description: 'Get detailed fund list', preserveOutput: ['funds'] },
      { toolName: 'list_payments', args: {}, description: 'Get recent payments', preserveOutput: ['payments'] },
    ],
    description: 'Analyzing treasury balance and cash flow',
    confidence: 0.85,
  }),

  inventory_analysis: (entities, ctx) => ({
    steps: [
      { toolName: 'inventory_summary', args: {}, description: 'Get inventory summary', preserveOutput: ['invSummary'] },
      { toolName: 'list_inventory_items', args: {}, description: 'Get detailed inventory list', preserveOutput: ['items'] },
    ],
    description: 'Analyzing inventory levels and low-stock items',
    confidence: 0.85,
  }),

  project_details: (entities, ctx) => {
    const projectId = entities.projectId || ctx.currentProjectId;
    if (!projectId) throw new Error('Project ID required');
    return {
      steps: [
        { toolName: 'get_project', args: { projectId }, description: 'Get project details', preserveOutput: ['project'] },
        { toolName: 'list_buildings', args: { projectId }, description: 'List project buildings', preserveOutput: ['buildings'] },
        { toolName: 'list_project_funds', args: { projectId }, description: 'Get project funds', preserveOutput: ['funds'] },
      ],
      description: `Gathering full project details`,
      confidence: 0.9,
    };
  },

  employee_full_info: (entities, ctx) => {
    const empId = entities.employeeId || ctx.currentEmployeeId;
    if (!empId) throw new Error('Employee ID required');
    return {
      steps: [
        { toolName: 'get_employee', args: { employeeId: empId }, description: 'Get employee details', preserveOutput: ['employee'] },
        { toolName: 'list_attendance', args: { employeeId: empId }, description: 'Get attendance record', preserveOutput: ['attendance'] },
      ],
      description: 'Gathering full employee information',
      confidence: 0.9,
    };
  },

  purchase_analysis: (entities, ctx) => ({
    steps: [
      { toolName: 'list_purchases', args: {}, description: 'Fetch purchase orders', preserveOutput: ['purchases'] },
      { toolName: 'list_suppliers', args: {}, description: 'Fetch supplier list', preserveOutput: ['suppliers'] },
    ],
    description: 'Analyzing purchase trends and supplier activity',
    confidence: 0.8,
  }),

  knowledge_fusion: (entities, ctx) => {
    const projectId = entities.projectId || ctx.currentProjectId;
    if (!projectId) throw new Error('Project ID required');
    return {
      steps: [
        { toolName: 'get_project', args: { projectId }, description: 'Get project details', preserveOutput: ['project'] },
        { toolName: 'get_entity_timeline', args: { entityType: 'project', entityId: projectId, limit: 50 }, description: 'Get project timeline events', preserveOutput: ['timeline'] },
        { toolName: 'get_kpi', args: { projectId }, description: 'Get project KPIs', preserveOutput: ['kpi'] },
        { toolName: 'get_trends', args: { projectId }, description: 'Get project trend data', preserveOutput: ['trends'] },
      ],
      description: 'Deep analysis combining project data, timeline, and BI metrics',
      confidence: 0.85,
    };
  },
};

@Injectable()
export class ChainExecutorService {
  private readonly logger = new Logger(ChainExecutorService.name);

  constructor(
    private readonly tools: ToolRegistryService,
    private readonly context: ContextEngineService,
  ) {}

  /** Detect if a message triggers a known chain pattern */
  detectChain(message: string, entities: Record<string, any>, context: Record<string, any>): ChainPlan | null {
    const lower = message.toLowerCase();

    // Check for multi-tool signals
    const signals = [
      { pattern: /(delayed|delay|late).*(project|financial|impact|cost)/, key: 'delayed_project_impact' },
      { pattern: /(contractor|subcontractor).*(performance|eval|rating)/, key: 'contractor_performance' },
      { pattern: /(treasury|fund|cash|balance).*(low|analysis|why)/, key: 'treasury_analysis' },
      { pattern: /(inventory|stock).*(low|below|summary|analysis)/, key: 'inventory_analysis' },
      { pattern: /(project).*(details|full|info|overview)/, key: 'project_details' },
      { pattern: /(employee).*(info|details|full|record)/, key: 'employee_full_info' },
      { pattern: /(purchase|buy).*(trend|analysis|supplier)/, key: 'purchase_analysis' },
      { pattern: /(deep.*(analysis|dive)|root.*cause|complex|fusion)/, key: 'knowledge_fusion' },
      { pattern: /(why|analyze).*(project|performance|cost|budget)/, key: 'knowledge_fusion' },
    ];

    for (const signal of signals) {
      if (signal.pattern.test(lower)) {
        const chainFn = CHAIN_PATTERNS[signal.key];
        if (chainFn) {
          try {
            return chainFn(entities, context);
          } catch {
            return null;
          }
        }
      }
    }

    return null;
  }

  /** Execute a chain of tools sequentially, passing context between steps */
  async executeChain(
    plan: ChainPlan,
    conversationId: string,
    user: { sub: string; permissions: string[]; role: string; token: string },
  ): Promise<{ results: ToolResult[]; context: Record<string, any> }> {
    const results: ToolResult[] = [];
    const chainContext: Record<string, any> = {};

    for (const step of plan.steps) {
      this.logger.log(`Chain step: ${step.toolName} - ${step.description}`);

      const tool = this.tools.get(step.toolName);
      if (!tool) {
        results.push({ success: false, error: `Tool ${step.toolName} not found` });
        break;
      }

      // Merge chain context, conversation context, and step args
      const args = { ...chainContext, ...this.context.getAll(conversationId), ...step.args };

      try {
        const result = await tool.execute(args, user);
        results.push(result);

        if (!result.success) {
          this.logger.warn(`Chain step ${step.toolName} failed: ${result.error}`);
          break;
        }

        // Preserve specified output keys to chain context
        if (result.data && step.preserveOutput) {
          for (const key of step.preserveOutput) {
            chainContext[key] = result.data;
          }
        }
      } catch (error: any) {
        this.logger.error(`Chain step ${step.toolName} error: ${error.message}`);
        results.push({ success: false, error: error.message });
        break;
      }
    }

    return { results, context: chainContext };
  }
}
