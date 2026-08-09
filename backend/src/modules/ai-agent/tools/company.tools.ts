import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class GetCompanySettingsTool extends BaseTool {
  readonly name = 'get_company_settings';
  readonly description = 'Get company settings including branding, localization, and contact info.';
  readonly requiresPermission = 'company.read';
  readonly requiredEntity = 'company';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    try {
      const url = `${process.env.API_URL || 'http://localhost:3001'}/api/v1/company`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${user.token}` } });
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to retrieve company settings');
    }
  }
}

@Injectable()
export class UpdateCompanySettingsTool extends BaseTool {
  readonly name = 'update_company_settings';
  readonly description = 'Update company settings such as name, branding, localization, and contact info.';
  readonly requiresPermission = 'company.write';
  readonly requiredEntity = 'company';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    try {
      const url = `${process.env.API_URL || 'http://localhost:3001'}/api/v1/company`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(args),
      });
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Failed to update company settings');
    }
  }
}
