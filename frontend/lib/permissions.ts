// Frontend permission constants matching backend Permissions constant
// These are the dotted-string permission names used by the backend PermissionGuard
export const Permissions = {
  Projects: {
    Read: 'projects.read',
    Create: 'projects.create',
    Update: 'projects.update',
    Delete: 'projects.delete',
  },
  Buildings: {
    Read: 'buildings.read',
    Create: 'buildings.create',
    Update: 'buildings.update',
    Delete: 'buildings.delete',
  },
  EmployerBoq: {
    Read: 'employer-boq.read',
    Write: 'employer-boq.write',
  },
  AnalyticalBoq: {
    Read: 'analytical-boq.read',
    Write: 'analytical-boq.write',
    Import: 'analytical-boq.import',
  },
  FinalBoq: {
    Read: 'final-boq.read',
    Write: 'final-boq.write',
    Sync: 'final-boq.sync',
    Import: 'final-boq.import',
    Analyze: 'final-boq.analyze',
    ManageComponents: 'final-boq.manage-components',
  },
  ContractorBoq: {
    Read: 'contractor-boq.read',
    Write: 'contractor-boq.write',
    Allocate: 'contractor-boq.allocate',
  },
  Distribution: {
    Write: 'distribution.write',
  },
  Extracts: {
    Read: 'extracts.read',
    Write: 'extracts.write',
    Delete: 'extracts.delete',
  },
  Payments: {
    Read: 'payments.read',
    Write: 'payments.write',
  },
  Clients: {
    Read: 'clients.read',
    Create: 'clients.create',
    Update: 'clients.update',
    Delete: 'clients.delete',
  },
  Subcontractors: {
    Read: 'subcontractors.read',
    Create: 'subcontractors.create',
    Update: 'subcontractors.update',
    Delete: 'subcontractors.delete',
  },
  Suppliers: {
    Read: 'suppliers.read',
    Create: 'suppliers.create',
    Update: 'suppliers.update',
    Delete: 'suppliers.delete',
  },
  Employees: {
    Read: 'employees.read',
    Create: 'employees.create',
    Update: 'employees.update',
    Delete: 'employees.delete',
  },
  Attendance: {
    Read: 'attendance.read',
    Create: 'attendance.create',
    Update: 'attendance.update',
    Delete: 'attendance.delete',
  },
  Leaves: {
    Read: 'leaves.read',
    Create: 'leaves.create',
    Update: 'leaves.update',
    Delete: 'leaves.delete',
  },
  Holidays: {
    Read: 'holidays.read',
    Create: 'holidays.create',
    Update: 'holidays.update',
    Delete: 'holidays.delete',
  },
  Departments: {
    Read: 'departments.read',
    Create: 'departments.create',
    Update: 'departments.update',
    Delete: 'departments.delete',
  },
  Warehouses: {
    Read: 'warehouses.read',
    Create: 'warehouses.create',
    Update: 'warehouses.update',
    Delete: 'warehouses.delete',
  },
  Categories: {
    Read: 'categories.read',
    Create: 'categories.create',
    Update: 'categories.update',
    Delete: 'categories.delete',
  },
  Inventory: {
    Read: 'inventory.read',
    Create: 'inventory.create',
    Update: 'inventory.update',
    Delete: 'inventory.delete',
  },
  StockMovements: {
    Read: 'stock-movements.read',
    Create: 'stock-movements.create',
    Update: 'stock-movements.update',
    Delete: 'stock-movements.delete',
  },
  ProjectFunds: {
    Read: 'project-funds.read',
    Create: 'project-funds.create',
    Update: 'project-funds.update',
    Delete: 'project-funds.delete',
  },
  FundTransactions: {
    Read: 'fund-transactions.read',
    Create: 'fund-transactions.create',
    Update: 'fund-transactions.update',
    Delete: 'fund-transactions.delete',
  },
  Miscellaneous: {
    Read: 'miscellaneous.read',
    Create: 'miscellaneous.create',
    Update: 'miscellaneous.update',
    Delete: 'miscellaneous.delete',
  },
  Notifications: {
    Read: 'notifications.read',
    Create: 'notifications.create',
    Update: 'notifications.update',
    Delete: 'notifications.delete',
  },
  ProjectBoards: {
    Read: 'project-boards.read',
    Create: 'project-boards.create',
    Update: 'project-boards.update',
    Delete: 'project-boards.delete',
  },
  ClientStatements: {
    Read: 'client-statements.read',
    Create: 'client-statements.create',
    Update: 'client-statements.update',
    Delete: 'client-statements.delete',
  },
  SubcontractorStatements: {
    Read: 'subcontractor-statements.read',
    Create: 'subcontractor-statements.create',
    Update: 'subcontractor-statements.update',
    Delete: 'subcontractor-statements.delete',
  },
  Roles: {
    Read: 'roles.read',
    Create: 'roles.create',
    Update: 'roles.update',
    Delete: 'roles.delete',
  },
  Users: {
    Read: 'users.read',
    Create: 'users.create',
    Update: 'users.update',
    Delete: 'users.delete',
    AssignRole: 'users.assign-role',
    AssignProject: 'users.assign-project',
    ResetPassword: 'users.reset-password',
  },
  Profile: {
    Read: 'profile.read',
    Update: 'profile.update',
    ChangePassword: 'profile.change-password',
  },
  Audit: {
    View: 'audit.view',
  },
  RecycleBin: {
    View: 'recycle-bin.view',
    Restore: 'recycle-bin.restore',
    Delete: 'recycle-bin.delete',
  },
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions][keyof typeof Permissions[keyof typeof Permissions]];
