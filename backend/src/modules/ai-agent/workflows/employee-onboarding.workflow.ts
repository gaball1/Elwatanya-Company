import { Injectable } from '@nestjs/common';
import { BaseWorkflow, WorkflowStep, WorkflowPhase } from './base.workflow';

@Injectable()
export class EmployeeOnboardingWorkflow extends BaseWorkflow {
  readonly name = 'employee_onboarding';
  readonly description = 'Full employee onboarding with department, role, permissions, and shift assignment';
  readonly requiredPermissions = ['employees.create', 'employees.update'];

  readonly phases: WorkflowPhase[] = [
    { name: 'employee_record', description: 'Create employee record', steps: ['create_employee'] },
    { name: 'organization', description: 'Assign department and role', steps: ['assign_department', 'assign_role'] },
    { name: 'access', description: 'Configure permissions and shift', steps: ['assign_permissions', 'assign_shift', 'notify_completion'] },
  ];

  readonly steps: WorkflowStep[] = [
    {
      name: 'create_employee',
      toolName: 'create_employee',
      args: (ctx) => ({
        code: ctx.employeeCode || `EMP-${Date.now()}`,
        fullName: ctx.employeeName,
        nationalId: ctx.nationalId,
        phone: ctx.employeePhone,
        email: ctx.employeeEmail,
        hireDate: ctx.hireDate,
        salary: ctx.salary ? Number(ctx.salary) : undefined,
        status: 'active',
      }),
      requiresPermission: 'employees.create',
      description: 'Create the employee record',
      progressLabel: 'Creating employee record',
    },
    {
      name: 'assign_department',
      toolName: 'update_employee',
      args: (ctx) => ({
        id: ctx._step_create_employee_id,
        departmentId: ctx.departmentId,
      }),
      requiresPermission: 'employees.update',
      description: 'Assign employee to department',
      progressLabel: 'Assigning department',
      dependsOn: ['_step_create_employee_id'],
      condition: (ctx) => !!ctx.departmentId,
    },
    {
      name: 'assign_role',
      toolName: 'update_employee',
      args: (ctx) => ({
        id: ctx._step_create_employee_id,
        roleId: ctx.roleId,
      }),
      requiresPermission: 'employees.update',
      description: 'Assign employee role',
      progressLabel: 'Assigning role',
      dependsOn: ['_step_create_employee_id'],
      condition: (ctx) => !!ctx.roleId,
    },
    {
      name: 'assign_permissions',
      toolName: 'update_employee',
      args: (ctx) => ({
        id: ctx._step_create_employee_id,
        status: 'active',
      }),
      requiresPermission: 'employees.update',
      description: 'Finalize employee access',
      progressLabel: 'Configuring access',
      dependsOn: ['_step_create_employee_id'],
      optional: true,
    },
    {
      name: 'notify_completion',
      toolName: 'create_notification',
      args: (ctx) => ({
        title: `Employee Onboarded: ${ctx.employeeName}`,
        message: `Employee "${ctx.employeeName}" has been onboarded successfully.`,
        type: 'success',
        entityType: 'employee',
        entityId: ctx._step_create_employee_id,
      }),
      requiresPermission: 'notifications.create',
      description: 'Send employee onboarding notification',
      progressLabel: 'Sending notification',
      dependsOn: ['_step_create_employee_id'],
      optional: true,
    },
    {
      name: 'assign_shift',
      toolName: 'update_employee',
      args: (ctx) => ({
        id: ctx._step_create_employee_id,
        status: 'active',
      }),
      requiresPermission: 'employees.update',
      description: 'Assign work shift',
      progressLabel: 'Assigning shift',
      dependsOn: ['_step_create_employee_id'],
      condition: (ctx) => !!ctx.shiftId,
    },
  ];

  validateContext(context: Record<string, any>): string[] {
    const missing: string[] = [];
    if (!context.employeeName) missing.push('employeeName (Full name)');
    if (!context.employeeCode) missing.push('employeeCode (Employee code)');
    if (!context.hireDate) missing.push('hireDate (Hire date)');
    return missing;
  }

  getRequiredFields(): string[] {
    return ['employeeName', 'employeeCode', 'hireDate'];
  }
}
