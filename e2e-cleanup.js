const { db } = require('./e2e-lib');
// FK-aware cleanup for leftover ACC test data
(function cleanup() {
  const cmds = [
    `DELETE FROM "StockMovement" WHERE "itemId" IN (SELECT id FROM "InventoryItem" WHERE name LIKE '%ACC%' OR code='IT-ACC');`,
    `DELETE FROM "Purchase" WHERE "inventoryItemId" IN (SELECT id FROM "InventoryItem" WHERE name LIKE '%ACC%' OR code='IT-ACC');`,
    `DELETE FROM "Purchase" WHERE "itemName" LIKE '%ACC%';`,
    `DELETE FROM "InventoryItem" WHERE name LIKE '%ACC%' OR code='IT-ACC';`,
    `DELETE FROM "ContractorBoqItem" WHERE "contractorBoqId" IN (SELECT id FROM "ContractorBoq" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%')) OR "contractorBoqId" IN (SELECT id FROM "ContractorBoq" WHERE "subcontractorId" IN (SELECT id FROM "Subcontractor" WHERE name LIKE '%ACC%'));`,
    `DELETE FROM "ContractorBoqItemVersion" WHERE "contractorBoqItemId" IN (SELECT id FROM "ContractorBoqItem" WHERE "contractorBoqId" IN (SELECT id FROM "ContractorBoq" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%')));`,
    `DELETE FROM "ContractorBoq" WHERE "subcontractorId" IN (SELECT id FROM "Subcontractor" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "ContractorBoq" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "FinalBoqItem" WHERE "finalBoqId" IN (SELECT id FROM "FinalBoq" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%')) OR "finalBoqId" IN (SELECT id FROM "FinalBoq" WHERE "projectId" IN (SELECT id FROM "Project" WHERE name LIKE '%ACC%'));`,
    `DELETE FROM "Component" WHERE "finalBoqItemId" IN (SELECT id FROM "FinalBoqItem" WHERE "finalBoqId" IN (SELECT id FROM "FinalBoq" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%')));`,
    `DELETE FROM "FinalBoq" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "FinalBoq" WHERE "projectId" IN (SELECT id FROM "Project" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "AnalyticalBoqItem" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "EmployerBoqItem" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "BoqCodeCounter" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "SubcontractorStatement" WHERE "projectId" IN (SELECT id FROM "Project" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "Payment" WHERE "contractorId" IN (SELECT id FROM "Subcontractor" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "BuildingSubcontractor" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "BuildingSubcontractor" WHERE "subcontractorId" IN (SELECT id FROM "Subcontractor" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "Attendance" WHERE "buildingId" IN (SELECT id FROM "Building" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "Attendance" WHERE "projectId" IN (SELECT id FROM "Project" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "ProjectFund" WHERE "projectId" IN (SELECT id FROM "Project" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "UserProjectAssignment" WHERE "projectId" IN (SELECT id FROM "Project" WHERE name LIKE '%ACC%');`,
    `DELETE FROM "Building" WHERE name LIKE '%ACC%';`,
    `DELETE FROM "Project" WHERE name LIKE '%ACC%';`,
    `DELETE FROM "Subcontractor" WHERE name LIKE '%ACC%';`,
  ];
  let done = 0;
  for (const c of cmds) {
    const r = db(c);
    const m = r.match(/DELETE (\d+)/);
    if (m && Number(m[1]) > 0) { console.log('deleted', m[1], '->', c.slice(0, 60)); done += Number(m[1]); }
  }
  const leftover = db(`SELECT (SELECT count(*) FROM "Project" WHERE name LIKE '%ACC-%') AS p, (SELECT count(*) FROM "Building" WHERE name LIKE '%ACC%') AS b, (SELECT count(*) FROM "Subcontractor" WHERE name LIKE '%ACC%') AS s, (SELECT count(*) FROM "InventoryItem" WHERE code='IT-ACC') AS i;`);
  console.log('LEFTOVER:', leftover);
  console.log('TOTAL deleted:', done);
})();