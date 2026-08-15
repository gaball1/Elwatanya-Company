import { describe, it, expect } from 'vitest';
import { AiAgentService } from './ai-agent.service';
import { ContextEngineService } from './context/context-engine.service';
import { CreateProjectWorkflow } from './workflows/create-project.workflow';
import { EmployeeOnboardingWorkflow } from './workflows/employee-onboarding.workflow';

const empty = {} as any;

function makeService(): { service: AiAgentService; context: ContextEngineService } {
  const context = new ContextEngineService(empty);
  const service = new AiAgentService(
    empty, // planner
    empty, // tools
    context,
    empty, // memory
    empty, // permissions
    empty, // knowledge
    empty, // workflows
    empty, // chain
    empty, // evaluation
    empty, // conversation
    empty, // api
    empty, // analytics
    empty, // llmAgent
    empty, // audit
  );
  return { service, context };
}

function extract(service: AiAgentService, conversationId: string, message: string, workflow: CreateProjectWorkflow | EmployeeOnboardingWorkflow): void {
  (service as any).extractWorkflowArgs(conversationId, message, workflow);
}

describe('AiAgentService.extractWorkflowArgs', () => {
  it('extracts all required fields from a full follow-up message and persists them', () => {
    const { service, context } = makeService();
    const workflow = new CreateProjectWorkflow();

    extract(service, 'c1', 'project name is QA Acceptance Project, location is Cairo, client is ACME, date is 2026-08-01, budget is 1500000', workflow);

    const ctx = context.getAll('c1');
    expect(ctx.projectName).toBe('QA Acceptance Project');
    expect(ctx.projectLocation).toBe('Cairo');
    expect(ctx.clientName).toBe('ACME');
    expect(ctx.projectStartDate).toBe('2026-08-01');
    expect(ctx.projectBudget).toBe('1500000');
    expect(workflow.validateContext(ctx)).toEqual([]);
  });

  it('survives across turns so a two-message flow no longer re-asks for fields', () => {
    const { service, context } = makeService();
    const workflow = new CreateProjectWorkflow();

    extract(service, 'c6', 'create project', workflow);
    expect(workflow.validateContext(context.getAll('c6')).length).toBeGreaterThan(0);

    extract(service, 'c6', 'project name is X, location is Cairo, client is ACME, date is 2026-08-01', workflow);
    expect(workflow.validateContext(context.getAll('c6'))).toEqual([]);
  });

  it('extracts employee name without polluting projectName', () => {
    const { service, context } = makeService();

    extract(service, 'c2', 'add employee name is Ahmed phone is 01111111111', new EmployeeOnboardingWorkflow());

    const ctx = context.getAll('c2');
    expect(ctx.employeeName).toBe('Ahmed');
    expect(ctx.projectName).toBeUndefined();
  });

  it('lets an explicit "project name is ..." override a stale fragment', () => {
    const { service, context } = makeService();
    context.update('c3', { projectName: 'name' } as any);

    extract(service, 'c3', 'project name is QA Acceptance Project, location is Cairo', new CreateProjectWorkflow());

    expect(context.getAll('c3').projectName).toBe('QA Acceptance Project');
  });

  it('does not clobber an existing projectName with a bare mention', () => {
    const { service, context } = makeService();
    context.update('c4', { projectName: 'ALPHA' } as any);

    extract(service, 'c4', 'show me project ALPHA buildings', new CreateProjectWorkflow());

    expect(context.getAll('c4').projectName).toBe('ALPHA');
  });

  it('only sets clientName when the workflow requires it', () => {
    const { service, context } = makeService();

    extract(service, 'c5', 'client is ACME', new EmployeeOnboardingWorkflow());

    expect(context.getAll('c5').clientName).toBeUndefined();
  });
});

describe('AiAgentService.buildWhyReasoning — real counts from list_projects arrays', () => {
  const { service } = makeService();
  const why = (service as any).buildWhyReasoning.bind(service);

  it('counts projects from the raw list_projects array (why_project_delayed, Arabic)', () => {
    const msg = why(
      'why_project_delayed',
      [
        {
          success: true,
          data: [
            { status: 'active' },
            { status: 'on_hold' },
            { status: 'on-hold' },
            { status: 'completed' },
          ],
        },
      ],
      true,
    ) as string;
    expect(msg).not.toContain('لا توجد مشاريع');
    expect(msg).toContain('4 مشروع');
    expect(msg).toContain('2 متوقف');
  });

  it('handles an empty project list (why_project_delayed, Arabic)', () => {
    const msg = why('why_project_delayed', [{ success: true, data: [] }], true) as string;
    expect(msg).toBe('لا توجد مشاريع لتحليلها.');
  });

  it('keeps treasury reasoning on fund_summary data (why_treasury_low, Arabic)', () => {
    const msg = why(
      'why_treasury_low',
      [
        { success: true, data: { totalFunds: 3, totalBudget: 1000, totalSpent: 600, remaining: 400 } },
        { success: true, data: [] },
      ],
      true,
    ) as string;
    expect(msg).toContain('400');
  });

  it('keeps inventory reasoning on inventory_summary data (why_inventory_below_threshold, Arabic)', () => {
    const msg = why(
      'why_inventory_below_threshold',
      [{ success: true, data: { totalItems: 50, lowStock: 3, totalValue: 0 } }, { success: true, data: [] }],
      true,
    ) as string;
    expect(msg).toContain('3 من أصل 50');
  });
});
