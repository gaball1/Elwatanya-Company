import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';

@Injectable()
export class ListBuildingsTool extends BaseTool {
  readonly name = 'list_buildings';
  readonly description = 'List all buildings, optionally filtered by project';
  readonly requiresPermission = 'buildings.read';
  readonly requiredEntity = 'building';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { projectId?: string }, user: any): Promise<ToolResult> {
    if (args.projectId) {
      const data = await this.api.get(`/api/v1/projects/${args.projectId}/buildings`, user.token);
      return this.success(data?.data?.items || data?.data || []);
    }
    return this.fail('projectId is required');
  }
}

@Injectable()
export class GetBuildingTool extends BaseTool {
  readonly name = 'get_building';
  readonly description = 'Get building details by ID';
  readonly requiresPermission = 'buildings.read';
  readonly requiredEntity = 'building';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { buildingId: string }, user: any): Promise<ToolResult> {
    const data = await this.api.get(`/api/v1/buildings/${args.buildingId}`, user.token);
    return this.success(data?.data?.building || data?.data);
  }
}

@Injectable()
export class CreateBuildingTool extends BaseTool {
  readonly name = 'create_building';
  readonly description = 'Create a building under a project with optional geofence';
  readonly requiresPermission = 'buildings.create';
  readonly requiredEntity = 'building';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { projectId: string; name: string; code?: string; type?: string; startDate?: string; latitude?: number; longitude?: number; allowedRadius?: number }, user: any): Promise<ToolResult> {
    const data = await this.api.post(`/api/v1/projects/${args.projectId}/buildings`, {
      name: args.name,
      code: args.code || `B${Date.now()}`,
      type: args.type || 'RESIDENTIAL',
      startDate: args.startDate,
      latitude: args.latitude,
      longitude: args.longitude,
      allowedRadius: args.allowedRadius ?? 100,
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class UpdateBuildingTool extends BaseTool {
  readonly name = 'update_building';
  readonly description = 'Update building details';
  readonly requiresPermission = 'buildings.update';
  readonly requiredEntity = 'building';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { id?: string; name?: string; type?: string; status?: string; latitude?: number; longitude?: number; allowedRadius?: number }, user: any): Promise<ToolResult> {
    if (!args.id) return this.fail('id is required. Please provide the building ID to update.');
    const body: Record<string, any> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.type !== undefined) body.type = args.type;
    if (args.status !== undefined) body.status = args.status;
    if (args.latitude !== undefined) body.latitude = args.latitude;
    if (args.longitude !== undefined) body.longitude = args.longitude;
    if (args.allowedRadius !== undefined) body.allowedRadius = args.allowedRadius;
    const data = await this.api.patch(`/api/v1/buildings/${args.id}`, body, user.token);
    return this.success(data?.data || data);
  }
}
