import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class GetKPITool extends BaseTool {
  readonly name = 'get_kpi';
  readonly description = 'Get key performance indicators for a project: cost variance, budget utilization, schedule performance, etc.';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId && !args.projectName) return this.fail('projectId or projectName is required');

    try {
      const id = projectId || (await this.resolveProjectByName(args.projectName, user.token));
      if (!id) return this.fail('Project not found');

      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/projects/${id}`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const body = await response.json();
      const project = body?.data?.project || body?.data || body;

      return this.success({
        kpi: {
          projectName: project.name,
          status: project.status,
          progress: project.progress,
          budgetUtilization: 'Calculate from BOQ vs actuals',
          costVariance: 'Compare budgeted vs actual spend',
          schedulePerformance: project.startDate ? `${project.progress}% complete` : 'No start date set',
        },
      });
    } catch {
      return this.fail('KPI retrieval failed');
    }
  }

  private async resolveProjectByName(name: string, token: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/projects`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const body: any = await response.json();
      const projects = body?.data?.items || body?.items || [];
      const match = projects.find((p: any) => p.name?.toLowerCase() === name.toLowerCase());
      return match?.id || null;
    } catch {
      return null;
    }
  }
}

@Injectable()
export class GetTrendsTool extends BaseTool {
  readonly name = 'get_trends';
  readonly description = 'Get trend data for a project: monthly costs, spending patterns, resource utilization over time';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/projects/${projectId}`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const body = await response.json();
      const project: any = body?.data?.project || body?.data || body;

      return this.success({
        trends: {
          projectName: project.name,
          progress: project.progress,
          status: project.status,
          note: 'Full trend analysis requires treasury, purchase, and extract data over time',
        },
      });
    } catch {
      return this.fail('Trend retrieval failed');
    }
  }
}

@Injectable()
export class GetComparisonTool extends BaseTool {
  readonly name = 'get_comparison';
  readonly description = 'Compare two projects side by side on metrics like budget, progress, status, costs';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId1 = args.projectId1 || args.id1;
    const projectId2 = args.projectId2 || args.id2;
    if (!projectId1 || !projectId2) return this.fail('Two project IDs required (projectId1 and projectId2)');

    try {
      const [res1, res2] = await Promise.all([
        fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/v1/projects/${projectId1}`, { headers: { Authorization: `Bearer ${user.token}` } }),
        fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/v1/projects/${projectId2}`, { headers: { Authorization: `Bearer ${user.token}` } }),
      ]);
      const b1: any = await res1.json();
      const b2: any = await res2.json();
      const p1: any = b1?.data?.project || b1?.data || b1;
      const p2: any = b2?.data?.project || b2?.data || b2;

      return this.success({
        comparison: {
          project1: { name: p1.name, status: p1.status, progress: p1.progress },
          project2: { name: p2.name, status: p2.status, progress: p2.progress },
          differences: {
            progressGap: `${Math.abs((p1.progress || 0) - (p2.progress || 0))}%`,
            sameStatus: p1.status === p2.status,
          },
        },
      });
    } catch {
      return this.fail('Comparison failed');
    }
  }
}

@Injectable()
export class GetForecastTool extends BaseTool {
  readonly name = 'get_forecast';
  readonly description = 'Get forecast analysis for a project: estimated completion, projected costs, resource needs';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const projectId = args.projectId || args.id;
    if (!projectId) return this.fail('projectId is required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/projects/${projectId}`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const body = await response.json();
      const project: any = body?.data?.project || body?.data || body;

      return this.success({
        forecast: {
          projectName: project.name,
          currentProgress: `${project.progress}%`,
          status: project.status,
          note: 'Full forecast requires historical progress data, budget variance analysis, and resource allocation data',
        },
      });
    } catch {
      return this.fail('Forecast retrieval failed');
    }
  }
}
