import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';
import { schema, statusProps } from './tool-schemas';

@Injectable()
export class ListProjectsTool extends BaseTool {
  readonly name = 'list_projects';
  readonly description = 'List all projects with their code, name, status and progress. Supports filtering by status.';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';
  readonly parameters = schema({ ...statusProps });

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { status?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/projects', user.token);
    const projects = data?.data?.items || data?.data?.projects || [];
    return this.success(
      args.status
        ? projects.filter((p: any) => p.status === args.status)
        : projects,
    );
  }
}

@Injectable()
export class GetProjectTool extends BaseTool {
  readonly name = 'get_project';
  readonly description = 'Get project details by ID or name/code';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';
  readonly parameters = schema({
    projectId: { type: 'string', description: 'Project UUID (rarely needed — a name or code works).' },
    projectName: { type: 'string', description: 'Project name or code, e.g. NCM-2026.' },
  });

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { projectId: string }, user: any): Promise<ToolResult> {
    const data = await this.api.get(`/api/v1/projects/${args.projectId}`, user.token);
    return this.success(data?.data?.project || data?.data);
  }
}

@Injectable()
export class CreateProjectTool extends BaseTool {
  readonly name = 'create_project';
  readonly description = 'Create a new construction project';
  readonly requiresPermission = 'projects.create';
  readonly requiredEntity = 'project';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { code: string; name: string; location?: string; startDate?: string; status?: string; client?: string; description?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.post('/api/v1/projects', {
      code: args.code,
      name: args.name,
      location: args.location || '',
      startDate: args.startDate,
      status: (args.status || 'active').toLowerCase(),
      client: args.client || '',
      description: args.description || '',
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class UpdateProjectTool extends BaseTool {
  readonly name = 'update_project';
  readonly description = 'Update project details (name, status, location, etc.)';
  readonly requiresPermission = 'projects.update';
  readonly requiredEntity = 'project';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { id?: string; name?: string; location?: string; status?: string; client?: string; description?: string; startDate?: string; progress?: number }, user: any): Promise<ToolResult> {
    if (!args.id) return this.fail('id is required. Please provide the project ID to update.');
    const body: Record<string, any> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.location !== undefined) body.location = args.location;
    if (args.status !== undefined) body.status = args.status;
    if (args.client !== undefined) body.client = args.client;
    if (args.description !== undefined) body.description = args.description;
    if (args.startDate !== undefined) body.startDate = args.startDate;
    if (args.progress !== undefined) body.progress = args.progress;
    const data = await this.api.patch(`/api/v1/projects/${args.id}`, body, user.token);
    return this.success(data?.data || data);
  }
}
