import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class GetEntityTimelineTool extends BaseTool {
  readonly name = 'get_entity_timeline';
  readonly description = 'Get the timeline of events for any entity (project, building, extract, etc.). Returns ordered events showing what happened and when.';
  readonly requiresPermission = 'timeline.read';
  readonly requiredEntity = 'timeline';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const entityType = args.entityType || args.type;
    const entityId = args.entityId || args.id;
    if (!entityType || !entityId) return this.fail('entityType and entityId are required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/timeline/${entityType}/${entityId}?limit=${args.limit || 50}`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Timeline retrieval failed');
    }
  }
}

@Injectable()
export class GetEntityLifecycleTool extends BaseTool {
  readonly name = 'get_entity_lifecycle';
  readonly description = 'Get the lifecycle summary of an entity: created date, status changes, key events, and completion status';
  readonly requiresPermission = 'timeline.read';
  readonly requiredEntity = 'timeline';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const entityType = args.entityType || args.type;
    const entityId = args.entityId || args.id;
    if (!entityType || !entityId) return this.fail('entityType and entityId are required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/timeline/${entityType}/${entityId}/lifecycle`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Lifecycle retrieval failed');
    }
  }
}
