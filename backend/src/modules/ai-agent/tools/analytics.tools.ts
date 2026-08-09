import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';

const API = '/api/v1/analytics';

@Injectable()
export class GetProjectDashboardTool extends BaseTool {
  readonly name = 'get_project_dashboard';
  readonly description = 'Get the full project analytics dashboard: KPIs, earned value (EVM), progress, cost breakdown, BOQ intelligence, contractor performance, treasury, inventory, employees, buildings and risk engine';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/dashboard`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('Dashboard retrieval failed');
    }
  }
}

@Injectable()
export class GetProjectSummaryTool extends BaseTool {
  readonly name = 'get_project_summary';
  readonly description = 'AI-ready executive summary of a project: performance verdict, financials, top profitable and loss-making items, delayed contractors, top risks and recommended actions';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/summary`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('Summary retrieval failed');
    }
  }
}

@Injectable()
export class GetProjectProfitabilityTool extends BaseTool {
  readonly name = 'get_project_profitability';
  readonly description = 'Project profitability analysis: BOQ profit/margin, cost breakdown by item, top profit and loss-making BOQ items';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const [costs, boq] = await Promise.all([
        this.http.get(`${API}/project/${projectId}/costs`, user.token),
        this.http.get(`${API}/project/${projectId}/boq`, user.token),
      ]);
      return this.success({ cost: costs.data ?? costs, boq: boq.data ?? boq });
    } catch {
      return this.fail('Profitability analysis failed');
    }
  }
}

@Injectable()
export class GetProjectRisksTool extends BaseTool {
  readonly name = 'get_project_risks';
  readonly description = 'Project risk engine output: risk score, level, and actionable risk items with severity, probability, impact and recommendations';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/risks`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('Risk analysis failed');
    }
  }
}

@Injectable()
export class GetProjectProgressTool extends BaseTool {
  readonly name = 'get_project_progress';
  readonly description = 'Project progress analytics by project, building, category and contractor BOQ, including earned value schedule metrics';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/progress`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('Progress analysis failed');
    }
  }
}

@Injectable()
export class GetContractorAnalysisTool extends BaseTool {
  readonly name = 'get_contractor_analysis';
  readonly description = 'Subcontractor performance analysis: assigned and completed BOQ value, extracts, paid amounts, average execution, delays, reliability and performance scores';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/contractors`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('Contractor analysis failed');
    }
  }
}

@Injectable()
export class GetBoqAnalysisTool extends BaseTool {
  readonly name = 'get_boq_analysis';
  readonly description = 'BOQ intelligence: profit/loss classification per item, top profit, top loss, delayed and highest-cost BOQ items';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/boq`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('BOQ analysis failed');
    }
  }
}

@Injectable()
export class GetCashflowTool extends BaseTool {
  readonly name = 'get_cashflow';
  readonly description = 'Treasury and cash flow intelligence: cash in/out, balance, committed and upcoming payments, monthly cash flow, daily balances and 3-month forecast';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/treasury`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('Cash flow analysis failed');
    }
  }
}

@Injectable()
export class GetInventoryAnalysisTool extends BaseTool {
  readonly name = 'get_inventory_analysis';
  readonly description = 'Inventory intelligence: consumption, received stock, current and reserved stock, reorder items, material cost, inventory value and turnover';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/inventory`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('Inventory analysis failed');
    }
  }
}

@Injectable()
export class GetEmployeeAnalysisTool extends BaseTool {
  readonly name = 'get_employee_analysis';
  readonly description = 'Employee and attendance intelligence: attendance rate, late and absence percentages, worked and overtime hours, payroll cost and monthly trends';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/employees`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('Employee analysis failed');
    }
  }
}

@Injectable()
export class GetAttendanceAnalysisTool extends BaseTool {
  readonly name = 'get_attendance_analysis';
  readonly description = 'Attendance intelligence: attendance/absence/late rates, average working hours, overtime hours, active workforce, daily trend and breakdowns by building and department';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');
    try {
      const data = await this.http.get(`${API}/project/${projectId}/attendance`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('Attendance analysis failed');
    }
  }
}

@Injectable()
export class GetExecutiveDashboardTool extends BaseTool {
  readonly name = 'get_executive_dashboard';
  readonly description = 'Company-wide executive dashboard: totals across all projects, revenue, cost, profit, margin, cash balance, and per-project health summary';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  constructor(private readonly http: AgentHttpClient) { super(); }

  async execute(_args: Record<string, any>, user: any): Promise<any> {
    try {
      const data = await this.http.get(`${API}/executive`, user.token);
      return this.success(data.data ?? data);
    } catch {
      return this.fail('Executive dashboard retrieval failed');
    }
  }
}
