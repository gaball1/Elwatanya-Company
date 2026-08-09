import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';

@Injectable()
export class CreateNotificationTool extends BaseTool {
  readonly name = 'create_notification';
  readonly description = 'Create a notification for a user';
  readonly requiresPermission = 'notifications.create';
  readonly requiredEntity = 'notification';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: {
    title: string;
    message: string;
    titleEn?: string;
    messageEn?: string;
    type?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    link?: string;
  }, user: any): Promise<ToolResult> {
    if (!args.title) return this.fail('title is required. What should the notification say?');
    if (!args.message) return this.fail('message is required. What is the notification content?');

    const data = await this.api.post('/api/v1/notifications', {
      title: args.title,
      message: args.message,
      titleEn: args.titleEn || '',
      messageEn: args.messageEn || '',
      type: args.type || 'info',
      userId: args.userId || user.sub,
      entityType: args.entityType,
      entityId: args.entityId,
      link: args.link,
    }, user.token);
    return this.success(data?.notification || data?.data || data);
  }
}
