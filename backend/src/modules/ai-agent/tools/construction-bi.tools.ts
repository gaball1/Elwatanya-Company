import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { projectSchema } from './tool-schemas';

const API = '/api/v1/analytics';

@Injectable()
export class EvaluateAllKpisTool extends BaseTool {
  readonly name = 'evaluate_all_kpis';
  readonly description = 'Evaluate all construction KPIs for a project including earned value (EV, PV, AC, CPI, SPI, EAC, VAC), progress, BOQ profit/margin, cash flow, purchases, inventory, attendance, payroll, risk score and pending approvals';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';
  readonly parameters = projectSchema();

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/kpis`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('KPI evaluation failed');
    }
  }
}
