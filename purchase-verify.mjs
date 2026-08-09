const BASE = "http://localhost:3001/api/v1";

function unwrap(raw) {
  if (raw && typeof raw === "object" && "success" in raw) return raw.data;
  return raw;
}

async function req(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return unwrap(data);
}

function assert(cond, label) {
  if (!cond) throw new Error(`ASSERT FAILED: ${label}`);
  console.log(`  PASS: ${label}`);
}

(async () => {
  const login = await req("/auth/login", {
    method: "POST",
    body: { email: "admin@elwataniya.com", password: "Admin@123" },
  });
  const token = login.accessToken;
  assert(token, "login returns accessToken");

  const me = await req("/auth/me", { token });
  const userId = me?.user?.id || me?.id || me?.userId;
  console.log("  logged in as:", login.email || me?.user?.email || "?");

  const inv = await req("/inventory-items", { token });
  const items = inv.items || inv;
  assert(Array.isArray(items) && items.length > 0, `inventory list has ${items.length} items`);
  const target = items[0];
  console.log(`  target item: ${target.name} (qty=${target.quantity}, category=${target.categoryId || "null"})`);
  const beforeQty = Number(target.quantity);

  const projects = await req("/projects", { token });
  const projItems = projects?.items || projects?.data?.items || projects;
  assert(Array.isArray(projItems) && projItems.length > 0, "projects list available");
  const projectId = projItems[0].id;
  console.log("  project:", projectId);

  const created = await req("/purchases", {
    method: "POST",
    token,
    body: {
      projectId,
      itemName: target.name,
      quantity: 3,
      unit: target.unit || "قطعة",
      unitPrice: 12.5,
      date: new Date().toISOString().split("T")[0],
      categoryId: target.categoryId || undefined,
      createdBy: userId,
      supplierName: "Verify Supplier",
    },
  });
  const purchaseId = created.purchase?.id || created.id;
  console.log(`  created purchase: ${purchaseId}`);
  assert(purchaseId, "purchase created (pending)");

  const approved = await req(`/purchases/${purchaseId}/status`, { method: "PUT", token, body: { status: "approved" } });
  const approvedPur = approved.purchase || approved;
  assert(approvedPur.status === "approved", "purchase approved");

  const received = await req(`/purchases/${purchaseId}/status`, { method: "PUT", token, body: { status: "received" } });
  const recPur = received.purchase || received;
  assert(recPur.status === "received", "purchase received");
  assert(recPur.inventoryItemId, "received purchase linked to inventoryItemId");

  // Verify stock went up
  const afterInv = await req(`/inventory-items/${recPur.inventoryItemId}`, { token });
  const itemGet = afterInv.item || afterInv;
  const afterQty = Number(itemGet.quantity);
  assert(afterQty === beforeQty + 3, `stock-in increased qty ${beforeQty} -> ${afterQty}`);

  // Verify stock movements contain RECEIVE
  const movements = await req("/stock-movements", { token });
  const mvItems = movements.items || movements || [];
  const recvMv = mvItems.find((m) => m.reference === `GRN-${purchaseId.slice(0, 8)}`);
  assert(!!recvMv && recvMv.type === "RECEIVE" && Number(recvMv.quantity) === 3, "RECEIVE stock movement recorded (GRN ref)");

  const mvResidue = [];
  const afterInvQ = mvItems.find((m) => m.reference === `GRN-${purchaseId.slice(0, 8)}`);
  mvResidue.push(afterInvQ?.id);

  // ---- cancel reverses stock
  const cancelled = await req(`/purchases/${purchaseId}/status`, { method: "PUT", token, body: { status: "cancelled" } });
  const cancPur = cancelled.purchase || cancelled;
  assert(cancPur.status === "cancelled", "received purchase cancelled");

  const revIn = await req(`/inventory-items/${recPur.inventoryItemId}`, { token });
  const revItem = revIn.item || revIn;
  const revQty = Number(revItem.quantity);
  assert(revQty === beforeQty, `stock reversed to original qty ${beforeQty} (got ${revQty})`);

  const revMv = toMovs(await req("/stock-movements", { token })).find((m) => m.reference === `REV-${purchaseId.slice(0, 8)}`);
  assert(!!revMv && revMv.type === "ISSUE", "REV stock movement (ISSUE) created");
  mvResidue.push(revMv.id);

  // ---- cleanup: cancel movements + delete the cancelled purchase
  for (const id of mvResidue.filter(Boolean)) {
    try { await req(`/stock-movements/${id}`, { method: "DELETE", token }); } catch (e) { console.warn("  movement delete skipped:", e.message); }
  }
  await req(`/purchases/${purchaseId}`, { method: "DELETE", token });
  console.log(`  cleaned up: deleted purchase ${purchaseId} + ${mvResidue.filter(Boolean).length} movement(s)`);

  const after = await req(`/inventory-items/${recPur.inventoryItemId}`, { token });
  const afterItem = after.item || after;
  assert(Number(afterItem.quantity) === beforeQty, "no stock residue on target item");

  console.log("\nALL PURCHASE/INVENTORY CHECKS PASSED");
  process.exit(0);
})().catch((e) => {
  console.error("\nVERIFICATION FAILED:", e.message);
  process.exit(1);
});

function toMovs(raw) {
  return raw.items || (Array.isArray(raw) ? raw : []);
}