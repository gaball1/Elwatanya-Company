const BASE = "http://localhost:3001/api/v1";
function unwrap(raw) { if (raw && typeof raw === "object" && "success" in raw) return raw.data; return raw; }
async function req(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return unwrap(data);
}
(async () => {
  const login = await req("/auth/login", { method: "POST", body: { email: "admin@elwataniya.com", password: "Admin@123" } });
  const token = login.accessToken;
  const purchases = await req("/purchases", { token });
  const items = purchases.items || purchases;
  const dirty = items.filter((p) => String(p.itemName).includes("(verify)"));
  console.log("dirty purchases:", dirty.length);
  for (const p of dirty) {
    if (p.status !== "cancelled") {
      await req(`/purchases/${p.id}/status`, { method: "PUT", token, body: { status: "cancelled" } });
    }
    await req(`/purchases/${p.id}`, { method: "DELETE", token });
    if (p.inventoryItemId) {
      try { await req(`/inventory-items/${p.inventoryItemId}`, { method: "DELETE", token }); }
      catch (e) { console.warn("  item delete skipped:", e.message); }
    }
    console.log(`  cleaned purchase ${p.id} (itemName: ${p.itemName})`);
  }
  console.log("CLEANUP DONE");
})().catch((e) => { console.error("cleanup error:", e.message); process.exit(1); });