const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== BEFORE ===');
  const before = await p.permission.findMany({ orderBy: { name: 'asc' } });
  for (const perm of before) {
    console.log('  ' + perm.name + ' (id: ' + perm.id.substring(0,8) + '...)');
  }

  // Step 1: Replace underscore with hyphen (bulk rename)
  const underscorePerms = before.filter(perm => perm.name.includes('_'));
  console.log('\n=== Step 1: Replace _ with - ===');
  for (const perm of underscorePerms) {
    const newName = perm.name.replace(/_/g, '-');
    console.log(`  ${perm.name} → ${newName}`);
    await p.permission.update({
      where: { id: perm.id },
      data: { name: newName },
    });
  }

  // Step 2: Handle singular→plural renames
  const singularToPlural = [
    { from: 'project.', to: 'projects.' },
    { from: 'building.', to: 'buildings.' },
    { from: 'extract.', to: 'extracts.' },
    { from: 'payment.', to: 'payments.' },
    { from: 'employee.', to: 'employees.' },
    { from: 'subcontractor.', to: 'subcontractors.' },
    { from: 'supplier.', to: 'suppliers.' },
    { from: 'notification.', to: 'notifications.' },
  ];

  console.log('\n=== Step 2: Handle singular→plural ===');
  for (const { from, to } of singularToPlural) {
    const perms = await p.permission.findMany({
      where: { name: { startsWith: from } },
    });
    for (const perm of perms) {
      const newName = perm.name.replace(from, to);
      console.log(`  ${perm.name} → ${newName}`);
      await p.permission.update({
        where: { id: perm.id },
        data: { name: newName },
      });
    }
  }

  // Step 3: Handle specific renames
  const specificRenames = [
    { from: 'audit.read', to: 'audit.view' },
    { from: 'audit.export', to: 'audit.view' }, // Duplicate target - handle carefully
  ];

  console.log('\n=== Step 3: Handle specific renames ===');
  // First rename audit.read → audit.view
  const auditRead = await p.permission.findFirst({ where: { name: 'audit.read' } });
  if (auditRead) {
    console.log(`  audit.read → audit.view`);
    const existingView = await p.permission.findFirst({ where: { name: 'audit.view' } });
    if (existingView) {
      // Merge: re-assign role-permissions from audit.read to audit.view, then delete audit.read
      const rps = await p.rolePermission.findMany({ where: { permissionId: auditRead.id } });
      for (const rp of rps) {
        await p.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: rp.roleId, permissionId: existingView.id } },
          update: {},
          create: { roleId: rp.roleId, permissionId: existingView.id },
        });
      }
      await p.rolePermission.deleteMany({ where: { permissionId: auditRead.id } });
      await p.permission.delete({ where: { id: auditRead.id } });
    } else {
      await p.permission.update({
        where: { id: auditRead.id },
        data: { name: 'audit.view' },
      });
    }
  }
  // Then handle audit.export
  const auditExport = await p.permission.findFirst({ where: { name: 'audit.export' } });
  if (auditExport) {
    console.log(`  audit.export → audit.view (merge)`);
    const viewPerm = await p.permission.findFirst({ where: { name: 'audit.view' } });
    if (viewPerm) {
      const rps = await p.rolePermission.findMany({ where: { permissionId: auditExport.id } });
      for (const rp of rps) {
        await p.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: rp.roleId, permissionId: viewPerm.id } },
          update: {},
          create: { roleId: rp.roleId, permissionId: viewPerm.id },
        });
      }
      await p.rolePermission.deleteMany({ where: { permissionId: auditExport.id } });
      await p.permission.delete({ where: { id: auditExport.id } });
    }
  }

  // Handle recycle-bin permissions
  // DB doesn't have them, seed creates them — no rename needed.

  // Handle reports.* → no constant equivalent
  // These remain but won't be referenced by any @RequirePermission

  // Handle system.manage → no constant equivalent
  // Stays as orphan

  // Handle final-boq.component.create/update/delete → final-boq.manage-components
  console.log('\n=== Step 3b: Merge component permissions into manage-components ===');
  const componentPerms = await p.permission.findMany({
    where: { name: { startsWith: 'final-boq.component.' } },
  });
  const manageComponents = await p.permission.findFirst({
    where: { name: 'final-boq.manage-components' },
  });
  for (const cp of componentPerms) {
    console.log(`  ${cp.name} → merge into final-boq.manage-components`);
    if (manageComponents) {
      const rps = await p.rolePermission.findMany({ where: { permissionId: cp.id } });
      for (const rp of rps) {
        await p.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: rp.roleId, permissionId: manageComponents.id } },
          update: {},
          create: { roleId: rp.roleId, permissionId: manageComponents.id },
        });
      }
      await p.rolePermission.deleteMany({ where: { permissionId: cp.id } });
    }
    await p.permission.delete({ where: { id: cp.id } });
  }

  // Also handle final-boq.distribute → distribution.write
  const finalBoqDistribute = await p.permission.findFirst({ where: { name: 'final-boq.distribute' } });
  const distributionWrite = await p.permission.findFirst({ where: { name: 'distribution.write' } });
  if (finalBoqDistribute && distributionWrite) {
    console.log(`  final-boq.distribute → merge into distribution.write`);
    const rps = await p.rolePermission.findMany({ where: { permissionId: finalBoqDistribute.id } });
    for (const rp of rps) {
      await p.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: rp.roleId, permissionId: distributionWrite.id } },
        update: {},
        create: { roleId: rp.roleId, permissionId: distributionWrite.id },
      });
    }
    await p.rolePermission.deleteMany({ where: { permissionId: finalBoqDistribute.id } });
    await p.permission.delete({ where: { id: finalBoqDistribute.id } });
  }

  // Step 4: Delete orphaned permissions that don't match seed list
  const seedNames = [
    'projects.read', 'projects.create', 'projects.update', 'projects.delete',
    'buildings.read', 'buildings.create', 'buildings.update', 'buildings.delete',
    'employer-boq.read', 'employer-boq.write',
    'analytical-boq.read', 'analytical-boq.write', 'analytical-boq.import',
    'final-boq.read', 'final-boq.write', 'final-boq.sync', 'final-boq.import',
    'final-boq.analyze', 'final-boq.manage-components',
    'contractor-boq.read', 'contractor-boq.write', 'contractor-boq.allocate',
    'distribution.write',
    'extracts.read', 'extracts.write', 'extracts.delete',
    'payments.read', 'payments.write',
    'clients.read', 'clients.create', 'clients.update', 'clients.delete',
    'subcontractors.read', 'subcontractors.create', 'subcontractors.update', 'subcontractors.delete',
    'suppliers.read', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
    'employees.read', 'employees.create', 'employees.update', 'employees.delete',
    'attendance.read', 'attendance.create', 'attendance.update', 'attendance.delete',
    'leaves.read', 'leaves.create', 'leaves.update', 'leaves.delete',
    'holidays.read', 'holidays.create', 'holidays.update', 'holidays.delete',
    'departments.read', 'departments.create', 'departments.update', 'departments.delete',
    'warehouses.read', 'warehouses.create', 'warehouses.update', 'warehouses.delete',
    'categories.read', 'categories.create', 'categories.update', 'categories.delete',
    'inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete',
    'stock-movements.read', 'stock-movements.create', 'stock-movements.update', 'stock-movements.delete',
    'project-funds.read', 'project-funds.create', 'project-funds.update', 'project-funds.delete',
    'fund-transactions.read', 'fund-transactions.create', 'fund-transactions.update', 'fund-transactions.delete',
    'miscellaneous.read', 'miscellaneous.create', 'miscellaneous.update', 'miscellaneous.delete',
    'notifications.read', 'notifications.create', 'notifications.update', 'notifications.delete',
    'project-boards.read', 'project-boards.create', 'project-boards.update', 'project-boards.delete',
    'client-statements.read', 'client-statements.create', 'client-statements.update', 'client-statements.delete',
    'subcontractor-statements.read', 'subcontractor-statements.create', 'subcontractor-statements.update', 'subcontractor-statements.delete',
    'roles.read', 'roles.create', 'roles.update', 'roles.delete',
    'users.read',
    'audit.view',
    'recycle-bin.view', 'recycle-bin.restore', 'recycle-bin.delete',
  ];

  console.log('\n=== AFTER ===');
  const after = await p.permission.findMany({ orderBy: { name: 'asc' } });
  for (const perm of after) {
    const inSeed = seedNames.includes(perm.name);
    console.log(`  ${perm.name} ${inSeed ? '✓' : '⚠ orphan'}`);
  }

  console.log('\nDone. Run the seed next to add any missing permissions.');
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
