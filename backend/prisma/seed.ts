import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  { name: 'projects.read', description: 'View projects' },
  { name: 'projects.create', description: 'Create projects' },
  { name: 'projects.update', description: 'Update projects' },
  { name: 'projects.delete', description: 'Delete projects' },
  { name: 'buildings.read', description: 'View buildings' },
  { name: 'buildings.create', description: 'Create buildings' },
  { name: 'buildings.update', description: 'Update buildings' },
  { name: 'buildings.delete', description: 'Delete buildings' },
  { name: 'employer-boq.read', description: 'View employer BOQ items' },
  { name: 'employer-boq.write', description: 'Create/update employer BOQ items' },
  { name: 'analytical-boq.read', description: 'View analytical BOQ items' },
  { name: 'analytical-boq.write', description: 'Create/update analytical BOQ items' },
  { name: 'analytical-boq.import', description: 'Import analytical BOQ from employer' },
  { name: 'final-boq.read', description: 'View final BOQ items' },
  { name: 'final-boq.write', description: 'Create/update final BOQ items' },
  { name: 'final-boq.sync', description: 'Sync final BOQ from analytical' },
  { name: 'final-boq.import', description: 'Import final BOQ from employer' },
  { name: 'final-boq.analyze', description: 'Analyze final BOQ items into components' },
  { name: 'final-boq.manage-components', description: 'Manage final BOQ item components' },
  { name: 'contractor-boq.read', description: 'View contractor BOQ items' },
  { name: 'contractor-boq.write', description: 'Create/update contractor BOQ items' },
  { name: 'contractor-boq.allocate', description: 'Allocate items to contractors' },
  { name: 'distribution.write', description: 'Distribute components to contractors' },
  { name: 'extracts.read', description: 'View extracts' },
  { name: 'extracts.write', description: 'Create/update extracts' },
  { name: 'extracts.delete', description: 'Delete extracts' },
  { name: 'payments.read', description: 'View payments' },
  { name: 'payments.write', description: 'Create payments' },
  { name: 'clients.read', description: 'View clients' },
  { name: 'clients.create', description: 'Create clients' },
  { name: 'clients.update', description: 'Update clients' },
  { name: 'clients.delete', description: 'Delete clients' },
  { name: 'subcontractors.read', description: 'View subcontractors' },
  { name: 'subcontractors.create', description: 'Create subcontractors' },
  { name: 'subcontractors.update', description: 'Update subcontractors' },
  { name: 'subcontractors.delete', description: 'Delete subcontractors' },
  { name: 'suppliers.read', description: 'View suppliers' },
  { name: 'suppliers.create', description: 'Create suppliers' },
  { name: 'suppliers.update', description: 'Update suppliers' },
  { name: 'suppliers.delete', description: 'Delete suppliers' },
  { name: 'employees.read', description: 'View employees' },
  { name: 'employees.create', description: 'Create employees' },
  { name: 'employees.update', description: 'Update employees' },
  { name: 'employees.delete', description: 'Delete employees' },
  { name: 'attendance.read', description: 'View attendance records' },
  { name: 'attendance.create', description: 'Create attendance records' },
  { name: 'attendance.update', description: 'Update attendance records' },
  { name: 'attendance.delete', description: 'Delete attendance records' },
  { name: 'leaves.read', description: 'View leaves' },
  { name: 'leaves.create', description: 'Create leaves' },
  { name: 'leaves.update', description: 'Update leaves' },
  { name: 'leaves.delete', description: 'Delete leaves' },
  { name: 'holidays.read', description: 'View holidays' },
  { name: 'holidays.create', description: 'Create holidays' },
  { name: 'holidays.update', description: 'Update holidays' },
  { name: 'holidays.delete', description: 'Delete holidays' },
  { name: 'departments.read', description: 'View departments' },
  { name: 'departments.create', description: 'Create departments' },
  { name: 'departments.update', description: 'Update departments' },
  { name: 'departments.delete', description: 'Delete departments' },
  { name: 'warehouses.read', description: 'View warehouses' },
  { name: 'warehouses.create', description: 'Create warehouses' },
  { name: 'warehouses.update', description: 'Update warehouses' },
  { name: 'warehouses.delete', description: 'Delete warehouses' },
  { name: 'categories.read', description: 'View categories' },
  { name: 'categories.create', description: 'Create categories' },
  { name: 'categories.update', description: 'Update categories' },
  { name: 'categories.delete', description: 'Delete categories' },
  { name: 'inventory.read', description: 'View inventory items' },
  { name: 'inventory.create', description: 'Create inventory items' },
  { name: 'inventory.update', description: 'Update inventory items' },
  { name: 'inventory.delete', description: 'Delete inventory items' },
  { name: 'stock-movements.read', description: 'View stock movements' },
  { name: 'stock-movements.create', description: 'Create stock movements' },
  { name: 'stock-movements.update', description: 'Update stock movements' },
  { name: 'stock-movements.delete', description: 'Delete stock movements' },
  { name: 'project-funds.read', description: 'View project funds' },
  { name: 'project-funds.create', description: 'Create project funds' },
  { name: 'project-funds.update', description: 'Update project funds' },
  { name: 'project-funds.delete', description: 'Delete project funds' },
  { name: 'fund-transactions.read', description: 'View fund transactions' },
  { name: 'fund-transactions.create', description: 'Create fund transactions' },
  { name: 'fund-transactions.update', description: 'Update fund transactions' },
  { name: 'fund-transactions.delete', description: 'Delete fund transactions' },
  { name: 'purchases.read', description: 'View purchase orders' },
  { name: 'purchases.create', description: 'Create purchase orders' },
  { name: 'purchases.update', description: 'Update purchase orders' },
  { name: 'purchases.delete', description: 'Delete purchase orders' },
  { name: 'company.write', description: 'Update company settings' },
  { name: 'settings.read', description: 'View system settings' },
  { name: 'settings.write', description: 'Update system settings' },
  { name: 'reports.read', description: 'View available reports' },
  { name: 'reports.generate', description: 'Generate reports' },
  { name: 'files.read', description: 'View and download files' },
  { name: 'files.upload', description: 'Upload files' },
  { name: 'files.delete', description: 'Delete files' },
  { name: 'fund-transactions.delete', description: 'Delete fund transactions' },
  { name: 'miscellaneous.read', description: 'View miscellaneous records' },
  { name: 'miscellaneous.create', description: 'Create miscellaneous records' },
  { name: 'miscellaneous.update', description: 'Update miscellaneous records' },
  { name: 'miscellaneous.delete', description: 'Delete miscellaneous records' },
  { name: 'notifications.read', description: 'View notifications' },
  { name: 'notifications.create', description: 'Create notifications' },
  { name: 'notifications.update', description: 'Update notifications' },
  { name: 'notifications.delete', description: 'Delete notifications' },
  { name: 'project-boards.read', description: 'View project boards' },
  { name: 'project-boards.create', description: 'Create project boards' },
  { name: 'project-boards.update', description: 'Update project boards' },
  { name: 'project-boards.delete', description: 'Delete project boards' },
  { name: 'client-statements.read', description: 'View client statements' },
  { name: 'client-statements.create', description: 'Create client statements' },
  { name: 'client-statements.update', description: 'Update client statements' },
  { name: 'client-statements.delete', description: 'Delete client statements' },
  { name: 'subcontractor-statements.read', description: 'View subcontractor statements' },
  { name: 'subcontractor-statements.create', description: 'Create subcontractor statements' },
  { name: 'subcontractor-statements.update', description: 'Update subcontractor statements' },
  { name: 'subcontractor-statements.delete', description: 'Delete subcontractor statements' },
  { name: 'roles.read', description: 'View roles' },
  { name: 'roles.create', description: 'Create roles' },
  { name: 'roles.update', description: 'Update roles' },
  { name: 'roles.delete', description: 'Delete roles' },
  { name: 'users.read', description: 'View users' },
  { name: 'users.create', description: 'Create users' },
  { name: 'users.update', description: 'Update users' },
  { name: 'users.delete', description: 'Delete users' },
  { name: 'users.assign-role', description: 'Assign roles to users' },
  { name: 'users.assign-project', description: 'Assign projects to users' },
  { name: 'users.reset-password', description: 'Reset user passwords' },
  { name: 'profile.read', description: 'View own profile' },
  { name: 'profile.update', description: 'Update own profile' },
  { name: 'profile.change-password', description: 'Change own password' },
  { name: 'audit.view', description: 'View audit logs' },
  { name: 'timeline.read', description: 'View entity timelines' },
  { name: 'recycle-bin.view', description: 'View recycle bin' },
  { name: 'recycle-bin.restore', description: 'Restore deleted items' },
  { name: 'recycle-bin.delete', description: 'Permanently delete items' },
  { name: 'approvals.read', description: 'View approval requests' },
  { name: 'approvals.create', description: 'Submit approval requests' },
  { name: 'approvals.approve', description: 'Approve requests' },
  { name: 'approvals.reject', description: 'Reject requests' },
];

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@elwataniya.com' },
    update: {},
    create: {
      email: 'admin@elwataniya.com',
      passwordHash,
      name: 'System Administrator',
      role: UserRole.CEO,
      status: 'ACTIVE',
    },
  });

  const permissionRecords = await Promise.all(
    ALL_PERMISSIONS.map((perm) =>
      prisma.permission.upsert({
        where: { name: perm.name },
        update: { description: perm.description },
        create: { name: perm.name, description: perm.description },
      }),
    ),
  );

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: { description: 'Super Administrator - complete system access', isSystem: true },
    create: {
      name: 'SUPER_ADMIN',
      description: 'Super Administrator - complete system access',
      isSystem: true,
    },
  });

  await prisma.rolePermission.createMany({
    data: permissionRecords.map((p) => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });

  // Create standard roles for the system
  const standardRoles = [
    { name: 'TECHNICAL_OFFICE', description: 'Technical office - projects and BOQ management' },
    { name: 'PROJECT_MANAGER', description: 'Project manager - assigned projects only' },
    { name: 'SITE_ENGINEER', description: 'Site engineer - assigned projects only' },
    { name: 'ACCOUNTANT', description: 'Accountant - treasury and payments' },
    { name: 'HR', description: 'Human resources - employees and attendance' },
    { name: 'STORE_KEEPER', description: 'Store keeper - warehouses and inventory' },
    { name: 'PROCUREMENT', description: 'Procurement - suppliers and purchase orders' },
    { name: 'ATTENDANCE_OFFICER', description: 'Attendance officer - attendance management' },
    { name: 'CONTRACTOR', description: 'Contractor - own BOQ, extracts, payments' },
    { name: 'CLIENT', description: 'Client - own statements and projects' },
  ];

  const rolePermissionMap: Record<string, string[]> = {
    TECHNICAL_OFFICE: [
      'projects.read', 'projects.create', 'projects.update',
      'buildings.read', 'buildings.create', 'buildings.update',
      'employer-boq.read', 'employer-boq.write',
      'analytical-boq.read', 'analytical-boq.write', 'analytical-boq.import',
      'final-boq.read', 'final-boq.write', 'final-boq.sync', 'final-boq.import', 'final-boq.analyze', 'final-boq.manage-components',
      'contractor-boq.read', 'contractor-boq.write', 'contractor-boq.allocate',
      'distribution.write',
      'extracts.read', 'extracts.write',
      'payments.read',
      'approvals.read', 'approvals.create', 'approvals.approve', 'approvals.reject',
      'project-boards.read', 'project-boards.create', 'project-boards.update', 'project-boards.delete',
      'files.read', 'files.upload', 'files.delete',
      'timeline.read',
      'reports.read', 'reports.generate',
      'notifications.read', 'notifications.update',
      'profile.read', 'profile.update', 'profile.change-password',
    ],
    PROJECT_MANAGER: [
      'projects.read',
      'buildings.read',
      'employer-boq.read',
      'analytical-boq.read',
      'final-boq.read',
      'contractor-boq.read',
      'extracts.read',
      'payments.read',
      'project-funds.read', 'project-funds.create',
      'fund-transactions.read', 'fund-transactions.create',
      'approvals.read', 'approvals.approve', 'approvals.reject',
      'project-boards.read',
      'files.read', 'files.upload', 'files.delete',
      'timeline.read',
      'reports.read', 'reports.generate',
      'notifications.read', 'notifications.update',
      'profile.read', 'profile.update', 'profile.change-password',
    ],
    SITE_ENGINEER: [
      'projects.read',
      'buildings.read',
      'employer-boq.read',
      'analytical-boq.read',
      'final-boq.read',
      'contractor-boq.read', 'contractor-boq.allocate',
      'extracts.read',
      'attendance.read',
      'approvals.read',
      'project-boards.read',
      'files.read', 'files.upload', 'files.delete',
      'timeline.read',
      'reports.read',
      'notifications.read', 'notifications.update',
      'profile.read', 'profile.update', 'profile.change-password',
    ],
    ACCOUNTANT: [
      'extracts.read', 'extracts.write',
      'payments.read', 'payments.write',
      'project-funds.read', 'project-funds.create', 'project-funds.update',
      'fund-transactions.read', 'fund-transactions.create',
      'clients.read',
      'subcontractors.read',
      'suppliers.read',
      'purchases.read',
      'project-boards.read',
      'files.read', 'files.upload', 'files.delete',
      'approvals.read', 'approvals.create', 'approvals.approve', 'approvals.reject',
      'reports.read', 'reports.generate',
      'notifications.read', 'notifications.update',
      'profile.read', 'profile.update', 'profile.change-password',
    ],
    HR: [
      'employees.read', 'employees.create', 'employees.update', 'employees.delete',
      'attendance.read', 'attendance.create', 'attendance.update', 'attendance.delete',
      'leaves.read', 'leaves.create', 'leaves.update', 'leaves.delete',
      'holidays.read', 'holidays.create', 'holidays.update', 'holidays.delete',
      'departments.read',
      'reports.read',
      'notifications.read', 'notifications.update',
      'profile.read', 'profile.update', 'profile.change-password',
    ],
    STORE_KEEPER: [
      'warehouses.read', 'warehouses.create', 'warehouses.update',
      'categories.read', 'categories.create', 'categories.update',
      'inventory.read', 'inventory.create', 'inventory.update',
      'stock-movements.read', 'stock-movements.create',
      'approvals.read', 'approvals.create', 'approvals.approve', 'approvals.reject',
      'timeline.read',
      'reports.read',
      'notifications.read', 'notifications.update',
      'profile.read', 'profile.update', 'profile.change-password',
    ],
    PROCUREMENT: [
      'suppliers.read', 'suppliers.create', 'suppliers.update',
      'purchases.read', 'purchases.create', 'purchases.update',
      'categories.read',
      'warehouses.read',
      'inventory.read',
      'reports.read',
      'notifications.read', 'notifications.update',
      'profile.read', 'profile.update', 'profile.change-password',
    ],
    ATTENDANCE_OFFICER: [
      'attendance.read', 'attendance.create', 'attendance.update', 'attendance.delete',
      'employees.read',
      'reports.read',
      'notifications.read', 'notifications.update',
      'profile.read', 'profile.update', 'profile.change-password',
    ],
    CONTRACTOR: [
      'contractor-boq.read',
      'extracts.read', 'extracts.write',
      'payments.read',
      'notifications.read', 'notifications.update',
      'profile.read', 'profile.update', 'profile.change-password',
    ],
    CLIENT: [
      'client-statements.read',
      'projects.read',
      'notifications.read', 'notifications.update',
      'profile.read', 'profile.update', 'profile.change-password',
    ],
  };

  for (const roleDef of standardRoles) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    });

    const allowedPermissions = rolePermissionMap[roleDef.name] ?? [];
    const allowedRecords = permissionRecords.filter((p) => allowedPermissions.includes(p.name));
    if (allowedRecords.length > 0) {
      await prisma.rolePermission.createMany({
        data: allowedRecords.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  console.log(`Seed completed:`);
  console.log(`  - Admin user: admin@elwataniya.com / Admin@123`);
  console.log(`  - ${ALL_PERMISSIONS.length} permissions created/updated`);
  console.log(`  - SUPER_ADMIN role created with all permissions`);
  console.log(`  - ${standardRoles.length} standard roles created with permissions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
