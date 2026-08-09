import { ToolResult } from '../dto/agent-response.dto';

export enum WorkflowStepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export interface WorkflowStep {
  name: string;
  toolName: string;
  args: Record<string, any> | ((context: Record<string, any>) => Record<string, any>);
  requiresPermission?: string;
  description: string;
  /** If true, the step can be skipped if context already has the result */
  optional?: boolean;
  /** If set, the step depends on this context key being available from a previous step */
  dependsOn?: string[];
  /** Condition function — step only runs if this returns true */
  condition?: (context: Record<string, any>) => boolean;
  /** Label for user-facing progress messages */
  progressLabel?: string;
}

export interface WorkflowState {
  name: string;
  status: 'active' | 'completed' | 'failed' | 'paused';
  currentStepIndex: number;
  startedAt: Date;
  updatedAt: Date;
  stepStatuses: Record<string, WorkflowStepStatus>;
  stepResults: Record<string, ToolResult>;
  context: Record<string, any>;
  error?: string;
}

export interface WorkflowPhase {
  name: string;
  description: string;
  steps: string[]; // step names
}

export abstract class BaseWorkflow {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly requiredPermissions: string[];
  abstract readonly steps: WorkflowStep[];
  abstract readonly phases: WorkflowPhase[];

  abstract validateContext(context: Record<string, any>): string[];

  /** Return human-readable labels for fields the user must provide */
  abstract getRequiredFields(): string[];

  /** Optional hook: build a structured executive report from workflow results. */
  buildReport?(results: ToolResult[], context: Record<string, any>): string;

  getNextStep(currentStepIndex: number, context: Record<string, any>): { step: WorkflowStep; missingFields: string[] } | null {
    if (currentStepIndex >= this.steps.length) return null;

    // Find the next executable step (skipping optional/conditional steps that can't run yet)
    for (let i = currentStepIndex; i < this.steps.length; i++) {
      const step = this.steps[i];

      // Check condition
      if (step.condition && !step.condition(context)) continue;

      // Check dependencies
      const deps = step.dependsOn || [];
      const missingDeps = deps.filter((d) => !context[d]);
      if (missingDeps.length > 0 && !step.optional) continue;

      const fields = typeof step.args === 'function' ? [] : Object.keys(step.args);
      const stepArgs = typeof step.args === 'function' ? {} : step.args;
      const missing = fields.filter((f) => !context[f] && !stepArgs[f]);

      return { step, missingFields: missing };
    }

    return null;
  }

  createState(context: Record<string, any>): WorkflowState {
    return {
      name: this.name,
      status: 'active',
      currentStepIndex: 0,
      startedAt: new Date(),
      updatedAt: new Date(),
      stepStatuses: {},
      stepResults: {},
      context: { ...context },
    };
  }

  getPhaseForStep(stepName: string): string | null {
    for (const phase of this.phases) {
      if (phase.steps.includes(stepName)) return phase.name;
    }
    return null;
  }
}
