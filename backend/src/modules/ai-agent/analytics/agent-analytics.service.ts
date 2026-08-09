import { Injectable } from "@nestjs/common";

export interface IntentCount {
  intent: string;
  count: number;
  lastUsed: string;
}

export interface ToolCallCount {
  tool: string;
  count: number;
  success: number;
  failed: number;
}

export interface WorkflowCount {
  workflow: string;
  started: number;
  completed: number;
  failed: number;
}

export interface HourlyBucket {
  hour: string;
  count: number;
}

@Injectable()
export class AgentAnalyticsService {
  private totalRequests = 0;
  private totalErrors = 0;
  private intentMap = new Map<string, { count: number; lastUsed: string }>();
  private toolMap = new Map<string, { count: number; success: number; failed: number }>();
  private workflowMap = new Map<string, { started: number; completed: number; failed: number }>();
  private hourlyBuckets = new Map<string, number>();
  private startTime = new Date();

  trackRequest(intent: string): void {
    this.totalRequests++;
    const now = new Date().toISOString();
    const entry = this.intentMap.get(intent) || { count: 0, lastUsed: now };
    entry.count++;
    entry.lastUsed = now;
    this.intentMap.set(intent, entry);

    const hourKey = now.substring(0, 13);
    this.hourlyBuckets.set(hourKey, (this.hourlyBuckets.get(hourKey) || 0) + 1);
  }

  trackToolCall(tool: string, success: boolean): void {
    const entry = this.toolMap.get(tool) || { count: 0, success: 0, failed: 0 };
    entry.count++;
    if (success) entry.success++;
    else entry.failed++;
    this.toolMap.set(tool, entry);
  }

  trackWorkflowEvent(name: string, event: "started" | "completed" | "failed"): void {
    const entry = this.workflowMap.get(name) || { started: 0, completed: 0, failed: 0 };
    entry[event]++;
    this.workflowMap.set(name, entry);
  }

  trackError(): void {
    this.totalErrors++;
  }

  getStats(): { summary: { totalRequests: number; totalErrors: number; uniqueIntents: number; uniqueTools: number; uptimeSeconds: number; errorRate: number }; topIntents: IntentCount[]; toolStats: ToolCallCount[]; workflowStats: WorkflowCount[]; hourly: HourlyBucket[]; serverStart: string } {
    const now = new Date();
    const uptime = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);

    const topIntents: IntentCount[] = Array.from(this.intentMap.entries())
      .map(([intent, data]) => ({ intent, ...data }))
      .sort((a, b) => b.count - a.count);

    const toolStats: ToolCallCount[] = Array.from(this.toolMap.entries())
      .map(([tool, data]) => ({ tool, ...data }))
      .sort((a, b) => b.count - a.count);

    const workflowStats: WorkflowCount[] = Array.from(this.workflowMap.entries())
      .map(([name, data]) => ({ workflow: name, ...data }));

    const hourly: HourlyBucket[] = Array.from(this.hourlyBuckets.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return {
      summary: {
        totalRequests: this.totalRequests,
        totalErrors: this.totalErrors,
        uniqueIntents: this.intentMap.size,
        uniqueTools: this.toolMap.size,
        uptimeSeconds: uptime,
        errorRate: this.totalRequests > 0 ? Number(((this.totalErrors / this.totalRequests) * 100).toFixed(2)) : 0,
      },
      topIntents: topIntents.slice(0, 20),
      toolStats: toolStats.slice(0, 20),
      workflowStats,
      hourly,
      serverStart: this.startTime.toISOString(),
    };
  }

  reset(): void {
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.intentMap.clear();
    this.toolMap.clear();
    this.workflowMap.clear();
    this.hourlyBuckets.clear();
    this.startTime = new Date();
  }
}
