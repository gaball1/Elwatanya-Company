import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class GetSettingsTool extends BaseTool {
  readonly name = 'get_settings';
  readonly description = 'Get system settings by group (company, finance, attendance, ai, notifications, etc.) or a specific setting.';
  readonly requiresPermission = 'settings.read';
  readonly requiredEntity = 'settings';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const group = args.group;
    const key = args.key;

    try {
      let url = `${process.env.API_URL || 'http://localhost:3001'}/api/v1/settings`;
      if (group && key) url += `/${group}/${key}`;
      else if (group) url += `/${group}`;

      const response = await fetch(url, { headers: { Authorization: `Bearer ${user.token}` } });
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Settings retrieval failed');
    }
  }
}

@Injectable()
export class UpdateSettingsTool extends BaseTool {
  readonly name = 'update_settings';
  readonly description = 'Update system settings for a specific group and key. Requires settings.write permission.';
  readonly requiresPermission = 'settings.write';
  readonly requiredEntity = 'settings';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const group = args.group;
    const key = args.key;
    const value = args.value;

    if (!group || (!key && !args.values)) return this.fail('Group and key or values are required');

    try {
      if (args.values) {
        const response = await fetch(
          `${process.env.API_URL || 'http://localhost:3001'}/api/v1/settings/${group}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
            body: JSON.stringify({ values: args.values }),
          },
        );
        const data = await response.json();
        return this.success(data);
      }

      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/settings/${group}/${key}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ value }),
        },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Settings update failed');
    }
  }
}
