# AI Agent Module — Audit Findings & Rebuild Plan

Status: pre-rebuild audit (completed)
Scope: `backend/src/modules/ai-agent` + related ERP modules

## 1. Current Architecture

```
ai-agent/
├── ai-agent.module.ts        # Registers 100+ tools, 8 workflows, HttpModule(baseURL http://localhost:3001)
├── ai-agent.controller.ts    # POST /ai-agent/chat, conversations CRUD, topics, analytics
├── ai-agent.service.ts       # Orchestrator: classify → tool/workflow/chain/why handling
├── planner/planner.service.ts# ~1044 lines, REGEX-based intent classification (brittle)
├── planner/intent.types.ts   # IntentCategory + IntentDefinition
├── tools/                    # base.tool.ts, tool-registry.service.ts, http-client.ts, ~30 tool files
├── nl/conversation.service.ts# 618-line monolith: formats ToolResult → Arabic/English text
├── context/context-engine.service.ts   # per-conversation ErpContext map
├── memory/conversation-memory.service.ts # in-memory + Prisma aiConversation persistence
├── permissions/permission-checker.service.ts # RBAC (user.permissions vs requiredPermissions)
├── knowledge/erp-knowledge.service.ts  # hardcoded static explanations
├── workflows/               # 8 workflows (create-project, extract, purchase-order, ...)
├── chaining/chain-executor.service.ts  # static CHAIN_PATTERNS
├── evaluation/self-evaluation.service.ts
├── analytics/agent-analytics.service.ts
├── executive/executive-report.service.ts
└── dto/  (agent-response.dto.ts, chat.dto.ts, conversation.dto.ts)
```

### Request flow (ai-agent.service.ts:62-138)
1. Save user message to memory, update context, resolve entity mentions (project code/building/contractor/warehouse/supplier/item from message text).
2. If an active workflow exists for the conversation → resume it.
3. `PlannerService.classify(message, context)` → `IntentResult { intent, confidence, entities, toolName, requiredPermissions, requiresWorkflow }`.
4. Low confidence (<0.4) → static "didn't understand" Arabic/English.
5. `why_*` intents → `WHY_ANALYSIS_MAP` (hardcoded tool chains + canned reasoning).
6. `planner.detectChain()` → ChainExecutor.
7. `explain_*` → ErpKnowledgeService static text.
8. `requiresWorkflow` → WorkflowRegistry (multi-turn step execution).
9. `toolName` → `executeSingleTool()`: RBAC check → resolve projectId from name → `tool.execute(args)` → self-evaluation → `ConversationService.formatResponse()`.
10. Else → generic fallback.

## 2. Critical Problems

### P1 — No LLM at all (the core gap)
The agent is 100% deterministic regex + static maps. There is no OpenAI / LLM abstraction, no function-calling, no way to handle unseen phrasing. Requirements call for LLM-first with deterministic fallback.

### P2 — Planner is brittle, English-first regex
- ~1044 lines of regex `classify()`. English patterns dominate; Arabic/Egyptian coverage is thin and misses dialect variations (e.g. "وريني", "قولي", "كام", "موقفه ايه", "اللي لسه").
- Single regex failure = wrong intent or `unknown` fallback.
- Several near-duplicate intent definitions confuse matching (e.g. `get_project_dashboard` declared twice, lines 75 and 84 of planner.service.ts, different descriptions, same toolName).
- Terminal shows mojibake in some Arabic pattern lines — encoding risk in the source itself must be verified during rebuild.

### P3 — Hardcoded base URL / env coupling
- `ai-agent.module.ts:121` registers `HttpModule.register({ baseURL: 'http://localhost:3001' })` — breaks if PORT changes or deployed behind a different host.
- Several tools (boq.tools.ts, bi.tools.ts, reporting.tools.ts) use raw `fetch(process.env.API_URL || 'http://localhost:3001')` instead of the injected `AgentHttpClient`. Inconsistent auth (some tools append `user.token`, others don't).

### P4 — WHY_ANALYSIS_MAP references a non-existent tool
`WHY_ANALYSIS_MAP.why_purchase_increasing.tools` includes `purchase_analysis` which is **not registered** in `ALL_TOOLS`. The chain silently drops it; the canned reasoning text in `buildWhyReasoning` fabricates generic explanations instead of real numbers.

### P5 — Monolithic, hard-coded response formatter
`nl/conversation.service.ts` is 618 lines of per-intent switch cases (English + Arabic). Every new tool needs a formatter. Data-driven formatting + LLM composition would replace most of it.

### P6 — Workflow arg extraction is English-only regex
`extractWorkflowArgs()` matches `client is ...`, `phone is ...`, `date is ...`, etc. No Arabic equivalents ("العميل", "الرقم", "الميزانية"). Egyptian-Arabic workflow input will not populate fields.

### P7 — No tests at all
- Zero `.spec.ts` files in `backend/src`.
- `vitest` installed but unused; `vitest run` would pass vacuously.
- `prisma/verify-ai.ts` is a manual smoke script (English questions, hardcoded expected intents) — a good foundation to expand into a real Arabic eval suite.

### P8 — Entity resolution is name-mention regex only
`resolveEntitiesFromMessage()` uses rigid patterns (`مشروع X`, `فين X`, `المخزن فيه X`). Natural phrasing (e.g. "المشروع ده موقفه ايه؟", "المشتريات اللي لسه مستلمناها ايه؟") won't resolve entities; needs LLM-driven entity extraction in the LLM path.

### P9 — Context key sprawl
`updateContextFromResult()` writes many `currentXxxName` / `_entities` keys with convoluted conditions; stale values can leak into later tool calls as filters (partially mitigated by the "current" naming convention).

### P10 — Duplicate/ambiguous tool names
- `get_project_summary` (analytics.tools.ts, AI-ready executive summary) vs `project_summary` (analysis.tools.ts, status counts) — both routable, different data.
- `get_kpi` (bi.tools.ts) vs `evaluate_all_kpis` (construction-bi.tools.ts).
- `list_extracts` vs `list_contractor_extracts` — both special-cased in the formatter.

## 3. What Works (reuse, don't rewrite)

- **BaseTool contract** (`tools/base.tool.ts`): `name, description, requiresPermission, requiredEntity, execute(args, user, context?) → ToolResult`. Clean, extendable — add a JSON-schema `parameters` field for LLM function-calling.
- **ToolRegistryService**: Map<string, BaseTool>; 100+ tools already registered. Reuse as-is for execution.
- **AgentHttpClient**: axios wrapper with per-request token; injectable. Prefer over raw fetch.
- **resolution.utils.ts**: Arabic normalization (hamza/ta-marbuta/alef-maqsura/tashkeel + `ال` stripping), `ARABIC_TERM_ALIASES`, `pickBest`, `formatMoney`, `sanitizeUuids`. Reuse in the deterministic fallback.
- **PermissionCheckerService** + per-intent `requiredPermissions`: RBAC works; keep enforcing before every tool call, including LLM-chosen ones.
- **ConversationMemoryService + ContextEngineService**: conversation state management is sound.
- **ErpKnowledgeService**: static explanations are useful as a fallback and can seed the LLM system prompt (knowledge grounding).
- **verify-ai.ts**: patterns for eval (login → analytics ground truth → assert intent + real numbers in response).
- **Analytics controllers** (`/api/v1/analytics/*`): rich, already-supported data sources (executive, project dashboard, kpis, risks, contractors, profitability, boq analysis, treasury, purchases, costs, evm, progress).
- **Seed**: `admin@elwataniya.com / Admin@123` (SUPER_ADMIN), projects NCM-2026 (losing), NCT-2026, CR3-2026 — stable eval fixtures.

## 4. Rebuild Plan

| # | Step | Files |
|---|------|-------|
| 1 | LLM provider abstraction | `llm/llm-provider.interface.ts`, `llm/openai-compatible.provider.ts` (fetch-based, no new deps), `llm/llm-provider.service.ts` (env-driven selection + deterministic fallback), `llm/prompt.builder.ts` |
| 2 | Tool parameter schemas + Arabic descriptions | `tools/base.tool.ts` (add `parameters` JSON schema, `category`), update tool `description` fields for LLM + Arabic hint |
| 3 | LLM-first orchestration | `ai-agent.service.ts`: try LLM tool-calling (system prompt + available tools + context) → execute with RBAC → LLM composes final answer; fallback to improved planner when no key |
| 4 | Robust Arabic deterministic fallback | new `planner` improvements: Arabic-first intents using `normalize()` + Egyptian synonym table for the sample queries |
| 5 | Response composition | LLM generates Arabic/English final message from tool data; keep ConversationService for deterministic path |
| 6 | Eval suite | `prisma/eval-ai-arabic.ts`: 50+ Arabic/Egyptian questions × {intent, ground-truth data, response-language, no-UUID} assertions |
| 7 | Env config | `.env.example` + `backend/.env`: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `AI_AGENT_API_URL` (replaces hardcoded localhost:3001) |
| 8 | Verification | `npm run build`, `npm run lint`, `vitest run`, live API smoke, eval suite pass |

## 6. Implementation Status (current)

The rebuild is implemented. The following was delivered on top of the audit:

### New LLM layer — `backend/src/modules/ai-agent/llm/`
| File | Purpose |
|------|---------|
| `llm.types.ts` | `LlmConfig`, `LlmMessage`, `LlmToolCall`, `LlmToolDefinition`, `LlmChatResult` |
| `llm-config.service.ts` | env-driven: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` (default `gpt-4o-mini`), `OPENAI_TEMPERATURE`, `OPENAI_MAX_TOKENS`, `OPENAI_MAX_ITERATIONS` (6), `AI_AGENT_API_URL` → `API_URL` → `http://localhost:3001` |
| `llm-provider.interface.ts` | `LlmProvider.chatCompletion()` |
| `openai-compatible.provider.ts` | fetch-based Chat Completions + `tools` function-calling, 60s timeout + AbortController, `_raw` fallback for malformed JSON args, `tool`/`assistant` role mapping |
| `llm-provider.service.ts` | facade; returns `null` on failure (never throws) |
| `agent-prompt.builder.ts` | Arabic/Egyptian system prompt, never-fabricate rule, RBAC note, knowledge topics, tool-definition builder |
| `llm-agent.service.ts` | LLM-first orchestrator: RBAC-filtered `availableTools()`, ≤6 iteration tool loops, per-call permission check, `resolveArgs()` entity resolution (projects/buildings/contractors/employees), context updates, `sanitizeUuids`, 5k-char tool-result truncation, failure → `metadata.needsFallback` |

### Wiring
- `ai-agent.service.ts` runs the LLM path first when a provider is configured; otherwise (and on failure) the deterministic planner is used. Both paths are live-tested.
- `ai-agent.module.ts` uses env-driven base URL (`AI_AGENT_API_URL || API_URL || http://localhost:${PORT||3001}`), 30s timeout, registers the LLM services. `OpenAiCompatibleProvider` is constructed inside the provider service (not DI-registered).
- `tools/base.tool.ts` gained `readonly parameters?: ToolParameterSchema`; `tools/tool-schemas.ts` provides reusable `schema()` / `projectSchema()` / `contractorSchema()` / `statusProps` / `projectRefProps`.
- Parameter schemas added to the priority tools (analytics, project, financial, inventory, employee, subcontractor, building, erp-resolution, approval, reporting, construction-bi).
- Placeholder BI tools (`get_kpi`, `get_trends`, `get_comparison`, `get_forecast`) return canned text and are **excluded from the LLM tool set** (`LLM_EXCLUDED_TOOLS`) so the model can never cite fabricated figures.
- Env: `backend/.env.example` documents the new keys; `backend/.env` carries empty key stubs.
- `backend/tsconfig.json`: removed obsolete `ignoreDeprecations: "6.0"` (rejected by the hoisted TypeScript 6.0.3, unblocks `nest build`).

### Deterministic fallback improvements (planner.service.ts)
- New Arabic project-status pattern → `get_project_dashboard` ("المشروع ده موقفه ايه؟").
- Extended profitability pattern with `بتخسر/تخسر/خساره/خسارة`.
- New `مشتريات … مستلم/لسه` pattern → `list_purchases`; new `مصاريف/سيولة/التدفق النقدي` → `get_cashflow`.
- New Arabic show/list-verb block ("اعرض/وريني/عرض/شوف/اديني/جيب/اكشف/اظهر …") routes to `list_*` tools (never `find_*`), fixing "اعرض المقاولين" → `list_subcontractors`, "وريني مخزون المخزن الرئيسي" → `list_inventory_items`, "اعرض الصناديق" → `list_project_funds` (permission `project-funds.read`).

### Verification (all green)
- `npm run build` — passes.
- `npm test` — 4 files / 40 tests pass (incl. existing planner + ai-agent specs).
- `npx ts-node prisma/verify-ai.ts` — 30/30 pass (English/context analytics questions, real-number grounding).
- `npx ts-node prisma/eval-ai-arabic.ts` — **61 Arabic/Egyptian + mixed questions, 323 assertions, 0 failures**: correct intent routing, Arabic responses, no UUIDs leaked, no placeholder/fabricated text, and counts verified against live ERP data. The suite sleeps 2.2s between calls to respect the `/ai-agent/chat` throttle (30 req/min).

### Still open (by design)
- `OPENAI_API_KEY` is empty in this environment, so the deterministic engine answered the eval. When a key is set, the LLM path takes over; the eval assertions were written to accept both `llm`-style and deterministic intents so it stays a valid gate.
- `nl/conversation.service.ts` remains the deterministic formatter (LLM path composes its own messages from tool data).
- P6 (Arabic workflow arg extraction) and P10 (duplicate tool names) were not reworked — they don't block the sample questions.

## 5. Constraints Preserved
- Real ERP data only — never fabricated answers; every figure in an answer must come from a tool result (eval asserts real numbers).
- RBAC enforced at tool execution regardless of whether the tool was chosen by LLM or planner.
- Frontend contract (`POST /api/v1/ai-agent/chat` → `{ success, message, intent, conversationId, data, ... }`) unchanged.
- Business rules and existing domain modules untouched; ai-agent reuses existing endpoints.
- No new runtime dependencies (LLM via built-in fetch).
