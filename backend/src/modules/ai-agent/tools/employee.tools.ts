import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';
import { schema } from './tool-schemas';

@Injectable()
export class ListEmployeesTool extends BaseTool {
  readonly name = 'list_employees';
  readonly description = 'List all employees';
  readonly requiresPermission = 'employees.read';
  readonly requiredEntity = 'employee';
  readonly parameters = schema({});

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(_args: any, user: any): Promise<ToolResult> {
    const data = await this.api.get('/api/v1/employees', user.token);
    return this.success(data?.data?.items || []);
  }
}

@Injectable()
export class GetEmployeeTool extends BaseTool {
  readonly name = 'get_employee';
  readonly description = 'Get employee details by ID or name';
  readonly requiresPermission = 'employees.read';
  readonly requiredEntity = 'employee';
  readonly parameters = schema({
    employeeId: { type: 'string', description: 'Employee UUID (rarely needed — a name works).' },
    employeeName: { type: 'string', description: 'Employee name.' },
  });

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { employeeId?: string }, user: any): Promise<ToolResult> {
    if (!args.employeeId) return this.fail('employeeId is required. Please provide the employee ID.');
    const data = await this.api.get(`/api/v1/employees/${args.employeeId}`, user.token);
    return this.success(data?.data?.employee || data?.data);
  }
}

@Injectable()
export class CreateEmployeeTool extends BaseTool {
  readonly name = 'create_employee';
  readonly description = 'Create a new employee record';
  readonly requiresPermission = 'employees.create';
  readonly requiredEntity = 'employee';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { code: string; fullName: string; nationalId?: string; phone?: string; email?: string; hireDate?: string; salary?: number; departmentId?: string; status?: string }, user: any): Promise<ToolResult> {
    const data = await this.api.post('/api/v1/employees', {
      code: args.code,
      fullName: args.fullName,
      nationalId: args.nationalId,
      phone: args.phone,
      email: args.email,
      hireDate: args.hireDate,
      salary: args.salary,
      departmentId: args.departmentId,
      status: (args.status || 'active').toLowerCase(),
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class UpdateEmployeeTool extends BaseTool {
  readonly name = 'update_employee';
  readonly description = 'Update an existing employee record';
  readonly requiresPermission = 'employees.update';
  readonly requiredEntity = 'employee';

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { id?: string; fullName?: string; phone?: string; email?: string; salary?: number; departmentId?: string; status?: string }, user: any): Promise<ToolResult> {
    if (!args.id) return this.fail('id is required. Please provide the employee ID to update.');
    const data = await this.api.patch(`/api/v1/employees/${args.id}`, {
      fullName: args.fullName,
      phone: args.phone,
      email: args.email,
      salary: args.salary,
      departmentId: args.departmentId,
      status: args.status,
    }, user.token);
    return this.success(data?.data || data);
  }
}

@Injectable()
export class ListAttendanceTool extends BaseTool {
  readonly name = 'list_attendance';
  readonly description = 'List attendance records, optionally filtered by date or employee. Use for "مين غايب/حاضر/متأخر النهارده؟" (who is absent/present/late today).';
  readonly requiresPermission = 'attendance.read';
  readonly requiredEntity = 'attendance';
  readonly parameters = schema({
    employeeId: { type: 'string', description: 'Employee UUID (rarely needed).' },
    employeeName: { type: 'string', description: 'Employee name.' },
    date: { type: 'string', description: 'ISO date YYYY-MM-DD (defaults to today).' },
  });

  constructor(private readonly api: AgentHttpClient) {
    super();
  }

  async execute(args: { employeeId?: string; date?: string }, user: any): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.employeeId) params.set('employeeId', args.employeeId);
    if (args.date) params.set('date', args.date);
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await this.api.get(`/api/v1/attendance${query}`, user.token);
    return this.success(data?.data?.items || []);
  }
}
