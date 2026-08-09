const BASE = "http://localhost:3001/api/v1";

async function req(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

function unwrap(raw) {
  if (raw && typeof raw === "object" && "success" in raw && raw.data !== undefined) return raw.data;
  return raw;
}

function assert(cond, label) {
  if (!cond) throw new Error(`ASSERT FAILED: ${label}`);
  console.log(`  PASS: ${label}`);
}

(async () => {
  const login = await req("/auth/login", { method: "POST", body: { email: "admin@elwataniya.com", password: "Admin@123" } });
  if (!login.ok) throw new Error("login failed: " + JSON.stringify(login.data));
  const token = unwrap(login.data).accessToken;
  assert(token, "login returns accessToken");

  const cases = [
    { name: "explain Arabic", message: "اشرح ليه البنود", expectIntent: "explain_boq", expectLen: 40 },
    { name: "list projects Arabic", message: "اعرض المشاريع", expectIntent: "list_projects" },
    { name: "explain BOQ en", message: "explain the BOQ workflow", expectIntent: "explain_boq", expectLen: 40 },
    { name: "conversations list", message: null },
  ];

  const createdConvs = [];
  let failed = 0;
  for (const c of cases) {
    if (!c.message) continue;
    const r = await req("/ai-agent/chat", { method: "POST", token, body: { message: c.message, context: {} } });
    const ok = r.ok && r.data && r.data.success === true;
    console.log(`  [${c.name}] status=${r.status} success=${r.data?.success} intent=${r.data?.intent} msgLen=${(r.data?.message || "").length}`);
    if (!ok) { console.log("    body:", JSON.stringify(r.data).slice(0, 300)); failed++; }
    else {
      assert(true, `${c.name} returned success`);
      if (c.expectIntent) assert(r.data.intent === c.expectIntent, `${c.name} routed to ${c.expectIntent}`);
      if (c.expectLen) assert((r.data.message || "").length >= c.expectLen, `${c.name} returned substantive content (>= ${c.expectLen} chars)`);
      if (r.data.conversationId) createdConvs.push(r.data.conversationId);
    }
  }

  // List conversations + clean up any created in this test
  const lst = await req("/ai-agent/conversations", { token });
  const items = unwrap(lst.data)?.items || [];
  console.log(`  total persisted conversations: ${items.length}`);
  assert(lst.ok && Array.isArray(items), "conversations list endpoint works");

  for (const id of createdConvs) {
    const d = await req(`/ai-agent/conversations/${id}`, { method: "DELETE", token });
    if (d.ok || d.status === 204) console.log(`  cleaned up conversation ${id}`);
  }

  if (failed > 0) { console.error(`\n${failed} AI case(s) failed`); process.exit(1); }
  console.log("\nALL AI AGENT SMOKE CHECKS PASSED");
  process.exit(0);
})().catch((e) => { console.error("\nVERIFICATION FAILED:", e.message); process.exit(1); });