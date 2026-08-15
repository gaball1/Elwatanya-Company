# Production Readiness Audit — El Wataniya Construction ERP

**Date:** 2026-08-15
**Mode:** Read-only audit. No application code modified during this audit.
**Baseline:** OWASP Top 10:2025, OWASP LLM/Agent Security, ERP/Financial Systems best practice.
**Verification note:** The audit was performed against the working tree at `D:\elwataniya-company`. The working tree is **dirty** (331 modified + 46 deleted files vs HEAD, per `git status`) — the repository has not yet been stabilized with a release commit, and there is no CI gate.

---

## Executive Summary

The application code is functionally mature, but the system is **NOT production-ready**. No severity P0 items may remain open before real traffic. The most critical facts:

1. **A live OpenAI API key sits in plaintext** in `backend/.env:12`, and an **active admin JWT** sits in `.admintoken` at the repo root. Both are git-ignored but present on disk.
2. **Zero backups exist.** Postgres survives container restarts via a named volume, but `docker compose down -v`, host loss, or corruption is unrecoverable. The seeded `backup.*` settings are inert config with no executor.
3. **No Dockerfiles for the apps** — only a `postgres` service in `docker-compose.yml`. No app containerization, no TLS, no reverse proxy.
4. **An attack chain is fully exploitable today:** public `POST /register` (P1) → JWT-only (no permission) controllers on `construction-analytics`, `construction-bi`, `ai-agent`, `signature-workflow` (P0/P1) → cross-project data reads via unscoped `findAll()` + `OwnershipService` null-`projectId` bypass (P1) → anonymous **SSRF** via `@Public() POST /pdf/render` (P0) → stored XSS via unauthenticated public file route serving uploaded SVG/HTML inline (P0).
5. **Financial integrity:** no single source of truth for extract math (3 formulas exist, statements trust the client entirely), two money tables use `Float`, and multiple non-atomic write paths can partially apply financial/inventory changes.

---

## Severity Rollup

| Severity | Count | Examples |
|---|---|---|
| **P0** | **10** | PDF SSRF; path traversal → arbitrary file write; public file XSS; open register → JWT-only modules; signature-workflow no auth; no Dockerfiles; live secrets on disk; no backups; no TLS; no graceful shutdown |
| **P1** | **~20** | Float money columns; non-atomic financial writes; JWT nested query per request; unpaginated endpoints; no ownership checks; refresh tokens in plaintext; no file size limits; uploads unpersisted/unbacked; dirty tree |
| **P2** | **~20** | Missing indexes; workflow step permission gaps; canned BI data; swagger always on; no env separation; stdout-only logs; hardcoded 5% insurance |
| **P3** | **~10** | CSV formula injection; leftover QA scripts; unpinned image; playwright in runtime deps |

---

# PHASE 1 — SECURITY AUDIT (OWASP Top 10:2025)

## P0 findings

### SEC-01 · P0 — Live secrets in plaintext env
- **File:** `backend/.env:1-4,12` (git-ignored, on disk)
- **Root cause:** `.env` ships a default JWT secret (`dev-secret-change-in-production`), DB password default, and a **live billable OpenAI key** in plaintext. `NODE_ENV=development` disables the secret-strength validation (`common/config/config-validation.ts:20-35`).
- **Fix:** Rotate the OpenAI key immediately; generate `openssl rand -base64 48` secrets; make validation fail-closed regardless of NODE_ENV; move secrets to a secrets manager.
- **Verification:** Old key rejected by provider; prod deploy refuses placeholder secrets.

### SEC-02 · P0 — Unauthenticated PDF render → blind SSRF (headless Chromium)
- **Files:** `modules/pdf-engine/pdf-engine.controller.ts:14-17` (`@Public()`, `body: any`); `modules/pdf-engine/application/pdf-engine.service.ts:357-363` (`resolveAssetUrl` passes any `http(s)://` into `<img src>`); `pdf-renderer.service.ts:29-35` (`--no-sandbox`), `:60-62` (`networkidle`).
- **Root cause:** Anonymous attacker POSTs JSON with `logoUrl`/`watermark`/`signatures[].imageUrl` = internal URL (169.254.169.254, 127.0.0.1, etc.). No allowlist, no private-IP block, no timeout.
- **Fix:** Require JWT; strict DTO; allow only relative `/api/v1/files/public/:id` or `data:image/(png|jpeg|webp)`; abort non-allowlisted Chromium requests; navigation timeout; concurrency cap.
- **Verification:** `POST /pdf/render` with cloud-metadata URL → observe outbound blocked.

### SEC-03 · P0 — Stored XSS via public file route (SVG/HTML served inline, unauthenticated)
- **Files:** `modules/file/file.controller.ts:80-93` (`@Public()`, inline, `Cache-Control public`); `file.service.ts:67` (MIME recomputed from user filename ext); `mime.util.ts:12,72-75` (SVG allowed); `local-file-storage.provider.ts:41-43` (public URL for `company/`); `company.controller.ts:35-113` (uploads any file); `seed.ts:230,248,264,279` (`files.upload` on 4 operational roles).
- **Root cause:** SVG is whitelisted; public route serves extension-derived `image/svg+xml` inline → `<script>` runs in ERP origin on direct navigation.
- **Fix:** magic-byte allowlist (PNG/JPEG/GIF/WebP), reject SVG/HTML; store verified MIME at upload; `Content-Disposition: attachment` + CSP sandbox on public route; signed download tokens.
- **Verification:** upload `evil.svg`, visit `/files/public/:id` unauthenticated → no script execution after fix.

### SEC-04 · P0 — Path traversal via unvalidated `category` → arbitrary file write
- **Files:** `file.controller.ts:30-31` (non-empty check only); `file.service.ts:25` (`${category}/${storedName}`); `local-file-storage.provider.ts:18` (`join(basePath, path)` escapes base).
- **Root cause:** `category=../../frontend/public` writes a `.html` into Next.js `public/` → static unauthenticated XSS. DTO enum (`upload-file.dto.ts:4-22`) is defined but never enforced.
- **Fix:** allowlist `/^[a-z0-9-]{1,64}$/`; assert `fullPath.startsWith(basePath)` after join; reject `/`, `\`, `..`, `.`.
- **Verification:** upload with traversal category → file stays under `uploads/`.

### SEC-05 · P0 — Signature workflows have no authorization (approval-chain forgery)
- **Files:** `modules/signature-workflow/signature-workflow.controller.ts` (72 lines, zero `@RequirePermission`); `sign()` at `:50-58` signs any request with `req.user?.sub`; AI tools `signature.tools.ts:8,30,59,88,117` all `requiresPermission = null`; planner intents carry no permissions.
- **Root cause:** `PermissionGuard` passes when metadata absent (`permission.guard.ts:15-17`). Any authenticated user (incl. self-registered) can create workflows, sign/reject requests, forge approval chains for contracts/extracts/invoices.
- **Fix:** `@RequirePermission` on all 9 routes; signer-vs-step identity check; non-null tool permissions.
- **Verification:** non-owner user signing a workflow → 403.

## P1 findings

### SEC-06 · P1 — Open public registration creates active accounts
- **Files:** `auth/auth.controller.ts:29-36` (`@Public @Post('register')`); `identity/application/use-cases/register-user.use-case.ts:29-84`; `user.entity.ts:87-89` (role EMPLOYEE, status ACTIVE); `auth.service.ts:75-76` (auto-issues tokens).
- **Fix:** Disable public register (provision via `admin/users`); require verification + `PENDING` if kept.
- **Verification:** `POST /register` → 403 after fix.

### SEC-07 · P1 — Missing authorization on 4+ modules (JWT-only)
- **Files (no `@RequirePermission`):**
  - `construction-analytics.controller.ts` — all 16 routes (executive dashboard, treasury, inventory, employees for any `projectId`)
  - `construction-bi.controller.ts` — all 4 routes (KPIs, dashboards)
  - `ai-agent.controller.ts` — all 7 routes (chat = LLM budget abuse, conversations, analytics)
  - `profile.controller.ts:42-59` — signature/avatar URL storage (feeds SSRF)
  - `setup-wizard.controller.ts:17` — setup state disclosure
- **Root cause:** `PermissionGuard` passes without metadata. "Authenticated" ≠ "Authorized".
- **Fix:** add `@RequirePermission` (analytics.read, reports.read, signature-workflow.*, profile.update, ai-agent.*).
- **Verification:** grep controller files → all routes carry permission metadata.

### SEC-08 · P1 — IDOR / BOLA — cross-project data access
- **Files:** `fund-transaction/application/use-cases/list-fund-transactions.use-case.ts:26-28` (`findAll()` no scope); `project-fund/.../list-project-funds.use-case.ts:21-23`; `stock-movement/.../list-stock-movements.use-case.ts:28-30`; `client-statement.controller.ts:23,26`; `subcontractor-statement.controller.ts:23,27`; `extract.controller.ts:50-51` (single projectId only); `common/services/ownership.service.ts:8-10,13,20` — **`isCrossProjectAdmin` returns true when `userProjectId` is null**; `list-projects.use-case.ts:13-19` (list-then-filter in memory).
- **Root cause:** object-level checks depend on caller remembering to pass single `projectId`; null project = "all projects"; no SQL scoping.
- **Fix:** pass `user.projectIds`; filter in Prisma (`projectId: { in: user.projectIds }`); remove null bypass (explicit SUPER_ADMIN check).
- **Verification:** user on project A reads project B fund/stock/statement → empty/403.

### SEC-09 · P1 — Weak password policy + inconsistent hashing
- **Files:** `admin-users.dto.ts:16,65` (`@MinLength(6)`); `auth.dto.ts:12` (6); hashers at cost 10 (`bcrypt-password-hasher.ts:9`) vs 12 (`auth.service.ts:168,199`) — two libraries (bcryptjs vs bcrypt).
- **Fix:** `@MinLength(12)` + complexity; single bcrypt impl at cost 12.
- **Verification:** unit test on password policy.

### SEC-10 · P1 — Refresh tokens stored in plaintext in DB
- **Files:** `auth/auth.service.ts:270-275` (raw `randomBytes(40).toString('hex')` stored; lookup `findUnique({ where: { token } })`).
- **Fix:** store `sha256(token)`; lookup by hash.
- **Verification:** DB dump contains no usable refresh token.

### SEC-11 · P1 — Password reset broken in prod; token returned in dev
- **Files:** `auth/auth.service.ts:141-159` — prod returns success without sending email; dev returns reset token in HTTP response.
- **Fix:** wire mail transport; never return token; throttle per-IP + per-account; expiry cleanup.

### SEC-12 · P1 — Untyped `body: any` bypasses validation
- **Files:** `signature-workflow.controller.ts:14,32,46,52`; `pdf-engine.controller.ts:17`; `file.controller.ts:47`; `ai-agent/dto/chat.dto.ts:11-17`.
- **Fix:** DTO classes everywhere; validate `context.*` with `@IsUUID()`.

### SEC-13 · P1 — No file-size limits on uploads (memory-exhaustion DoS)
- **Files:** `file.controller.ts:23`; `company.controller.ts:39,55,71,87,103`; `import-export.controller.ts:21` — all `FileInterceptor` without `limits`. `main.ts:31-32` caps only JSON (30MB).
- **Fix:** `{ limits: { fileSize: 10MB, files: 1 }, fileFilter }`; single choke point in `FileService.upload`; 413 on exceed.

### SEC-14 · P1 — No MIME/extension allowlist
- **Files:** `file.service.ts:22-48` (accepts any buffer); `mime.util.ts:32-42` (detection falls back to **client-declared content-type**).
- **Fix:** per-category allowlist by magic bytes AND extension; reject HTML/SVG/executables/archive bombs; store verified type.

### SEC-15 · P1 — No ownership checks on file download & board documents
- **Files:** `file.controller.ts:70-78` (any `files.read` downloads any id); `file.controller.ts:95-110` (list any category/entity); `project-board-document.controller.ts:46-54`; `prisma-file.repository.ts:12-15,22-25`.
- **Fix:** resolve entityType/entityId, require project assignment; centralized FileAccessGuard.

### SEC-16 · P1 — AI agent: chat endpoint has no permission gate + leaks raw token
- **Files:** `ai-agent/ai-agent.controller.ts:49-58`; `ai-agent.service.ts:246,264` (passes caller's raw Bearer token to internal calls); no `@RequirePermission`.
- **Fix:** gate chat behind permission; scope tools by `projectIds`; don't embed raw token in context/logs.

## P2 findings

### SEC-17 · P2 — Public file route + company uploads (covered by SEC-03); `DELETE /files/:id` no ownership check
- **File:** `file.controller.ts:112-118` — any `files.delete` deletes any file.

### SEC-18 · P2 — Swagger always exposed + CORS/helmet notes
- **Files:** `main.ts:51-61` (Swagger in all envs); `main.ts:34-37` (CORS allowlist OK); `app.module.ts:205` (CORP `cross-origin` relaxation).
- **Fix:** Swagger only when `NODE_ENV !== 'production'`.

### SEC-19 · P2 — Error leakage in non-production
- **Files:** `common/filters/global-exception.filter.ts:60-64` (returns `exception.message` when not prod); `common/utils/handle-error.ts:3-11`.
- **Fix:** generic client messages; detail only in logs.

### SEC-20 · P2 — AI chat IDOR: cross-user conversation takeover
- **Files:** `ai-agent.service.ts:70` (client-supplied `conversationId` used as-is); `conversation-memory.service.ts:29-47` (existence check only, no ownership).
- **Fix:** filter conversations by `userId`.

### SEC-21 · P2 — AI agent raw ERP/PII data sent to external LLM
- **Files:** `llm-agent.service.ts:120-123` (`JSON.stringify(toolResult.data)` up to 5000 chars → provider).
- **Fix:** field-level redaction before context build.

### SEC-22 · P2 — AI prompt-injection defenses weak; tool args unvalidated
- **Files:** `agent-prompt.builder.ts` (no injection-defense instructions); `llm-agent.service.ts:107-110` (no schema validation of tool args).
- **Fix:** injection-defense instructions + instruction/response separation; validate tool args against JSON schemas.

### SEC-23 · P2 — `global_search` tool has no agent-level permission
- **Files:** `search.tools.ts:8`; `planner.service.ts:56`; downstream only `search:query` (single permission, no per-entity scoping).

### SEC-24 · P2 — Workflow step tools not re-permission-checked
- **Files:** `ai-agent.service.ts:289-292` (workflow-level only), `:426` (steps run unconditionally). `knowledge_fusion` and `contractor_payment_analysis` call tools beyond their declared permissions (timeline/purchases/extracts/project-funds/knowledge, buildings/approvals/contractors/cashflow).

### SEC-25 · P2 — Agent tools don't enforce project scoping
- **Files:** `project.tools.ts:20`, `financial.tools.ts`, `employee.tools.ts` — return unfiltered data despite `projectIds` shown in prompt (`agent-prompt.builder.ts:47-48`).

### SEC-26 · P2 — AI audit trail gaps
- **Files:** `llm-agent.service.ts` imports no AuditService (LLM-path mutations unlogged); `ai-agent.service.ts:1020-1028` logs only success + intent, no args/results; no per-step audits.

### SEC-27 · P2 — No per-user agent quota; throttler raised to 300/min globally
- **Files:** `app.module.ts:91-96` (raised explicitly for AI workflows); `ai-agent.controller.ts:42` (30/min chat, but each turn fans out to 6 LLM calls).

### SEC-28 · P2 — Canned/placeholder BI data reachable via deterministic path + workflows
- **Files:** `bi.tools.ts:26-35,76-83,112-121,147-154` ("Calculate from BOQ vs actuals"); `knowledge-fusion.workflow.ts:32,90,98`. Contradicts grounding contract (`agent-prompt.builder.ts:26`).
- **Fix:** wire BI tools to real analytics endpoints; never present placeholder as real data.

### SEC-29 · P2 — `dto.context` unvalidated and merged into every tool call
- **Files:** `chat.dto.ts` (free-form context); `ai-agent.service.ts:73,210`.

### SEC-30 · P2 — `get_project_dashboard` intent defined twice with different descriptions
- **Files:** `planner.service.ts:72` and `:81`.

### SEC-31 · P2 — No per-tenant storage isolation
- **Files:** `local-file-storage.provider.ts:9` (single shared `uploads/`), `storage-registry.service.ts:18-21` (local only).
- **Fix:** `uploads/<tenantId>/` or per-tenant buckets; serve by ID only.

### SEC-32 · P2 — Orphan files never cleaned; branding replacements abandoned
- **Files:** `company.service.ts:50-59`; `queue/domain/job.interface.ts:13` (`MAINTENANCE_CLEANUP_TEMP` declared, never implemented).

### SEC-33 · P2 — Branding/profile accept arbitrary URL strings (XSS in `<img src>`/PDF)
- **Files:** `company/dto/update-company.dto.ts:15-38`; `profile.controller.ts:42-59`; `white-label.service.ts:49-62`; embedded in frontend `admin/settings/page.tsx:384-546` and PDF engine.
- **Fix:** accept only file IDs or allowlisted `https://`; reject `javascript:`, `data:text/html`.

### SEC-34 · P2 — Frontend renders uploaded HTML/SVG in iframe/img
- **Files:** `buildings/[buildingId]/documents/page.tsx:233-237`; `purchases/page.tsx:989-1000`; `client-statements/page.tsx:312`; `statements/page.tsx:296`.
- **Fix:** server-approved preview allowlist; `sandbox` on iframes; download (not inline-open) otherwise.

### SEC-35 · P2 — Extract sequence number enforced only in app code
- **File:** `extract.use-cases.ts:263-267` (manual duplicate check inside tx). No `@@unique([contractorBoqId, runningNumber])`.
- **Fix:** DB unique constraint.

### SEC-36 · P2 — Audit trail best-effort, outside transaction
- **Files:** `audit.service.ts:31-33` (swallows errors); `extract.use-cases.ts:336`; `update-final-boq-item.use-case.ts:79-82`. No outbox.

### SEC-37 · P2 — Hardcoded 5% insurance/deduction in 7 locations
- **Files:** `statements/new/page.tsx:69`, `extracts/new/page.tsx:37`, `extracts/[extractId]/edit/page.tsx:35`, `statements/[id]/edit/page.tsx:56`, `client-statements/new/page.tsx:78`, `client-statements/[statementId]/edit/page.tsx:63`; `ai-agent/workflows/extract-workflow.workflow.ts:25,43,61,80`; `setup-wizard.service.ts:75`. Settings key `defaultInsurancePercent` exists (`settings.service.ts:126`) but UI never reads it.
- **Fix:** single source via settings service.

## P3 findings

- **SEC-38 · P3** — JWT secret strength gated on NODE_ENV (`config-validation.ts:20-35`) — make unconditional.
- **SEC-39 · P3** — Dead `JWT_REFRESH_SECRET` config (`config-validation.ts:12`) — validated but unused.
- **SEC-40 · P3** — Dual `.env` loading precedence (`app.module.ts:87` `[".env", "../.env"]`).
- **SEC-41 · P3** — Signature workflow actor falls back to `'system'` (`signature-workflow.controller.ts:47,57`).
- **SEC-42 · P3** — Email enumeration via `ConflictException` on register (`register-user.use-case.ts:48-55`).
- **SEC-43 · P3** — CSV formula injection (`csv-format.provider.ts:51-56`, `csv-format.service.ts`) — prefix `'` for `= + - @ \t \r`.
- **SEC-44 · P3** — CSS injection via `pageSize`/`orientation`/`section.columns` in PDF (`pdf-engine.service.ts:139,336`) — enum-validate.
- **SEC-45 · P3** — Admin user creation lacks role/status enum validation (`admin-users.dto.ts:40`).
- **SEC-46 · P3** — `GET /ai-agent/topics` + `/ai-agent/analytics` no permission (`ai-agent.controller.ts:116-126`); agent analytics in-memory only.
- **SEC-47 · P3** — `create_notification` can target arbitrary users (`notification.tools.ts:37`).

## Verified GOOD (do not re-flag)
- Global `JwtAuthGuard` + `PermissionGuard` + `ThrottlerGuard` registered (`app.module.ts:181-192`); helmet headers + nosniff (`:205`).
- Strict `ValidationPipe` whitelist/forbidNonWhitelisted (`main.ts:42-49`).
- Prod placeholder-secret validation exists (`config-validation.ts:20-35`) — though NODE_ENV-gated.
- No string-concatenated SQL — all `$queryRaw`/`$executeRaw` are parameterized; Prisma API used elsewhere.
- JWT access (1d) + opaque rotating refresh tokens with family revocation (`auth.service.ts:79-128`).
- `buildContentDisposition` prevents header injection in PDF header (`common/pdf-header.util.ts:24-44`).

---

# PHASE 2 — AI SECURITY (OWASP LLM/Agent)

All AI findings are in SEC-05, SEC-07, SEC-16, SEC-20–SEC-30 above. Summary against the mandated checklist:

| Requirement | Status | Evidence |
|---|---|---|
| Never execute arbitrary SQL | ✅ | No SQL generation found; tools call REST APIs |
| Never bypass RBAC | ❌ | `get_executive_dashboard`, 5 signature tools, `global_search`, `render_pdf` have null permissions; workflows skip per-step checks |
| Never access another user's/project's data | ❌ | Chat conversation IDOR (SEC-20); no project scoping (SEC-25) |
| Only approved tools | ✅ | Tool registry is closed set (91 tools) |
| Respect authenticated user's permissions | ❌ | Deterministic path gates on planner-supplied permissions, LLM path on tool `requiresPermission`, but 4+ tools + workflows bypass |
| Validate tool arguments | ❌ | No schema validation at `execute()` (SEC-22) |
| Never trust user instructions as system instructions | ❌ | Weak prompt-injection defenses (SEC-22) |
| Resist prompt injection | ❌ | No injection-defense instructions; doc/search content flows verbatim |
| Prevent tool abuse | ⚠️ | Global throttle raised to 300/min; no per-user agent quota |
| Never fabricate financial numbers | ❌ | Canned/placeholder BI data reachable (SEC-28) |
| Answer from real ERP data | ⚠️ | Executive report claims no fabrication but canned KPIs exist |
| Log sensitive tool actions | ❌ | LLM path unlogged; no args/results (SEC-26) |

**P0 summary for AI:** (1) signature tools + workflow controller fully unauthenticated (SEC-05); (2) executive financial dashboard tool + controller with no RBAC (SEC-07); (3) conversation IDOR (SEC-20).

**Full 91-tool authorization table and 8-workflow permission matrix:** see the AI audit appendix referenced in session notes (tools with null permission: #47 `global_search`, #64 `render_pdf`, #65–69 signature tools, #82 `get_executive_dashboard`).

---

# PHASE 3 — ARCHITECTURE / REFACTOR

## FIN-01 · P0 — NO single source of truth for extract/statement math
Three different formulas for the same concept:
- Extract: `workValue = (previous + current) * (executionPercent/100) * unitPrice` — `modules/extract/domain/extract-rules.ts:39-44` (recomputes authoritatively)
- Subcontractor statement: `totalWorkValue = Σ (quantity * price)` — `frontend/.../statements/new/page.tsx:110`
- Client statement: `workValue = totalDone * unitPrice` — `frontend/.../client-statements/new/page.tsx:159-165`

Backend statement modules **do not compute at all**: `create-subcontractor-statement.use-case.ts:10-14` and `create-client-statement.use-case.ts:10-16` persist client-sent totals; DTOs accept totals with `@IsNumber()` only; entities store whatever came in. The extract module is the only authoritative recompute (`extract.entity.ts:112-158,174-216`).
**Duplication comments are explicit:** `extract-rules.ts:1-5`, `final-boq-rules.ts:1-4` — "mirrored from frontend/lib/boqStore.ts. Do not change formulas without updating the frontend store."

**Fix:** move all extract/statement math to one backend domain service consumed by all statement flows; server-side recompute + consistency check; retire frontend copies.

## Other refactor findings
- **Duplicated money formulas** between frontend `extractCalculations.ts:37-44` and backend `extract-rules.ts`.
- **Unused service/package:** `@supabase/supabase-js` imported nowhere (frontend/package.json:12).
- **Stub implementation:** `excel-format.provider.ts:10-14` throws "requires the `xlsx` package" — package not installed.
- **Dead config:** `JWT_REFRESH_SECRET` validated but unused.
- **Oversized concerns:** `ai-agent.service.ts` is ~1000+ lines; `prisma-final-boq.repository.ts` and `prisma-extract.repository.ts` are large.
- **Search engine non-functional (dead code path):** `search-engine.module.ts:5-9` registers no indexers; `registerIndexer()` never called; `buildIndex()` iterates empty map → `GET /search` always empty.
- **No refactor purely for style.** The above are correctness/maintainability driven.

---

# PHASE 4 — PERFORMANCE

## PERF-01 · P0 — Global search is non-functional AND O(N) in-memory scan
`search-engine.module.ts:5-9` registers no indexers; `buildIndex()` wipes an empty map (`search-engine.service.ts:16-27`); `search()` loops every entity in memory (`:29-77`). No `pg_trgm`/FTS/persistence. **Fix:** indexers per entity + PostgreSQL trigram GIN indexes.

## PERF-02 · P1 — Missing indexes on hot FK/filter columns
No `@@index` on: `Building.projectId`, `Statement.contractorBoqId`, `StatementDeduction.statementId`, `Distribution.finalBoqId`, `DistributionRow.distributionId`+`contractorId`, `Payment.*` (none), `Subcontractor.status`, `ContractorBoq.subcontractorId`, `FinalBoq.buildingId`. Well-indexed: Attendance, Leave, StockMovement, Purchase, Notification, Employee, AuditLog, Approval.

## PERF-03 · P1 — JWT auth does 4-level nested DB query per request
`auth/strategies/jwt.strategy.ts:28-45` per-request `user.findUnique` with nested role→permission→project includes. Runs on every API call (incl. 30s polls). **Fix:** permissionsVersion claim + short TTL cache.

## PERF-04 · P1 — Construction-BI evaluates ~20 KPIs sequentially, uncached
`construction-bi.service.ts:128-139` sequential loop; `getAttendanceData` (`:204-207`) loads all attendance and is invoked by 6 KPIs; duplicates `construction-analytics` (which has `analytics-cache.service.ts`). **Fix:** reuse cache + `Promise.all`.

## PERF-05 · P1 — Unpaginated list endpoints (full tables)
`/client-statements`, `/subcontractor-statements`, `/extracts`, `/employees`, `/stock-movements`, `/fund-transactions`, `/purchases`, `/buildings`, `/projects` (plus in-memory filter), `/notifications` page call without limit. **Fix:** standard `{skip,take}` DTOs returning `{items,total}` (pattern exists in approval/audit).

## PERF-06 · P1 — N+1 write loops in BOQ/distribution/notification paths
`prisma-final-boq.repository.ts:88-150` per-item update/upsert (100 items × 5 components ≈ 600 round-trips); `prisma-contractor-boq.repository.ts:38-47`; `create-leave.use-case.ts:32-49`; `create-stock-movement.use-case.ts:93-97` (per-user notification.create). **Fix:** `createMany`/batched updates.

## PERF-07 · P2 — Frontend over-fetch + duplicate calls
`usePagination.ts:8-12` slices client-side → pages fetch everything. Parallel full-list fetches: admin, attendance, history, users, departments, stock-movements, treasury, warehouse, project tabs, boards (`boards/page.tsx:53` — **frontend N+1**, one HTTP per board), notifications page (`notifications/page.tsx:46` no limit).

## PERF-08 · P2 — Two independent 30s notification timers
`Topbar.tsx:50` + `useNotifications.ts` (`/unread-count` poll). Two requests every 30s per tab. **Fix:** single poller; raise interval.

## PERF-09 · P2 — Notification visibility query not indexable
`prisma-notification.repository.ts:120-139` array-overlap on `targetRoles/targetPermissions`; missing composite `@@index([userId, read, createdAt])`.

## PERF-10 · P2 — Analytics cache invalidated on EVERY domain event + in-memory only
`analytics-cache.subscriber.ts:24-31` subscribes to `'*'` → `invalidateAll()`. **Fix:** invalidate by entity/project; Redis for multi-instance.

## PERF-11 · P2 — Company dataset loads full tables into memory
`analytics-data.service.ts:281-307` `attendance.findMany`/`inventoryItem.findMany` then in-memory reduce. **Fix:** `aggregate`/`_sum`.

## PERF-12 · P2 — No request-level caching/dedup on frontend
`lib/api/apiClient.ts` fresh fetch per call, no SWR/React Query. **Fix:** dedupe/cache layer.

## PERF-13 · P3 — Heavy/dead frontend deps
Remove `@supabase/supabase-js`; dynamic-import `exceljs` (`lib/boqExcel.ts:4` → ~1MB static).

## PERF-14 · P3 — Settings reads uncached (`settings.service.ts:25-43`).

## PERF-15 · P3 — Backend Excel export stub (see refactor).

## Already good
Audits/approvals paginated correctly; search caps limit≤100; construction-analytics single-pass memoized dataset; notification backend now supports limit/read/unread-count.

---

# PHASE 5 — DATABASE / FINANCIAL INTEGRITY

## FIN-02 · P1 — Float used for money
`schema.prisma` `ClientStatement.totalWorkValue/totalDeductions/netPayable` = Float (938-940); `SubcontractorStatement.insurancePercent/totalWorkValue/totalInsurance/totalDeductions/previousPaid/netPayable` = Float (967-972). All other money columns are `Decimal @db.Decimal(12,2)`. **Fix:** migrate to Decimal (prisma migration + data cast).

## FIN-03 · P1 — Non-atomic inventory increase
`increase-inventory-item.use-case.ts:40-42` opens `$transaction`, calls `items.save(item)` which uses main client `prisma.inventoryItem.upsert` (`prisma-inventory-item.repository.ts:11-39`) — quantity commits independently of `tx.stockMovement.create`. **Fix:** tx-aware save.

## FIN-04 · P1 — Non-atomic final-BOQ sync during distribution
`distribute-item.use-case.ts:105-163` and `distribute-component.use-case.ts:107-165`: allocation writes in `$transaction`, but `finalBoq.save` runs after close and opens its own transaction. **Fix:** join in one transaction.

## FIN-05 · P1 — Conflicting purchase balance semantics
`create-purchase.use-case.ts:50` / `create-miscellaneous.use-case.ts:41` guard `fund.pettyCashBalance`; `financial.service.ts:30-35` decrements `fund.currentBalance`; `fund-balance.util.ts:18-19,29-31` treats purchase/miscellaneous as pettyCash-only. Same category → different balances depending on path. **Fix:** unify semantics.

## FIN-06 · P1 — Read-modify-write balance updates without locking
`applyFundBalanceEffects` (`fund-balance.util.ts:48-64`), `FinancialService.recordExpense/reverseExpense/recordIncome` (`financial.service.ts:22-35,64-78,115-129`): read→Decimal→update inside tx, no row lock/conditional update. `ensureProjectFund` (`payment.use-cases.ts:30-42`) is TOCTOU. **Fix:** `UPDATE ... WHERE currentBalance = expected` or `SELECT ... FOR UPDATE`.

## FIN-07 · P2 — Extract running number not unique in DB (see SEC-35).

## FIN-08 · P2 — Audit trail best-effort, outside transaction (see SEC-36).

## FIN-09 · P2 — Hardcoded 5% insurance (see SEC-37).

## Verified GOOD
- Extract save fully transactional with tx-aware repo (`extract.use-cases.ts:230`).
- Payment create/update/delete all wrap payment + fund guard + ledger in one `$transaction` (`payment.use-cases.ts:163-177,269-293,358-369`).
- Purchase status-change has atomic transition guard + idempotent reversal on rejection (`update-purchase-status.use-case.ts:64-110`; `approval-entity-sync.subscriber.ts:135-199`).
- `Approval @@unique([entityType, entityId])`, `ProjectFund @@unique([projectId])`.
- `Prisma.Decimal` used consistently for arithmetic in financial paths.
- Stock-movement create/update use tx-aware effects.

---

# PHASE 6 — FILES / UPLOADS

Full endpoint inventory in the Files audit. Key outcomes:
- **P0:** path traversal (SEC-04); stored XSS via public SVG/HTML (SEC-03).
- **P1:** no size limits (SEC-13); no MIME allowlist (SEC-14); no ownership on download/list/delete (SEC-15, SEC-17); SSRF via PDF assets (SEC-02); frontend inline-renders of uploaded content (SEC-34).
- **P2:** no tenant isolation (SEC-31); orphan files (SEC-32); unvalidated branding URLs (SEC-33).
- **P3:** CSV formula injection (SEC-43).

Upload endpoints inventory (all gated by JWT except marked):
`POST /files/upload` (files.upload, **no size/MIME/category validation**), `POST /files/upload-base64` (files.upload, no validation), `GET /files/download/:id` (files.read, inline, no ownership), `GET /files/public/:id` (**@Public**, inline, category company), `GET /files` (files.read, any category), `DELETE /files/:id` (files.delete, no ownership), `POST /company/upload/{logo,small-logo,watermark,stamp,signature}` (company.write, no size/MIME), `POST /import-export/import` (no size), `POST /pdf/render` (**@Public**, SSRF), `POST /reporting/:name/generate` (reports.generate, unescaped HTML).

---

# PHASE 7 — PRODUCTION INFRASTRUCTURE

## INF-01 · P0 — No app containers / Dockerfiles
Only `postgres` in `docker-compose.yml:1-21`. No `Dockerfile` anywhere (glob + git history confirmed). Apps run as bare host processes. **Fix:** multi-stage Dockerfiles (backend: node:22-alpine, `prisma generate` + `migrate deploy` + `node dist/main`; frontend: `output:'standalone'`); `docker-compose.prod.yml`.

## INF-02 · P0 — No TLS / reverse proxy
No nginx/caddy/traefik config; no certs; no `secure` cookie flag. **Attendance GPS/camera hard-blocked on non-HTTPS origins** (browser `isSecureContext`) — `frontend/.../attendance/page.tsx:366,421,671`. **Fix:** TLS-terminating reverse proxy + Let's Encrypt; `Secure; HttpOnly` cookies.

## INF-03 · P0 — No backups (see Phase 8).

## INF-04 · P0 — No graceful shutdown
No `app.enableShutdownHooks()`, no SIGTERM handling (`main.ts:1-68`); Playwright browser never closed on kill → orphan Chromium. **Fix:** enableShutdownHooks + shutdown_timeout.

## INF-05 · P1 — Dirty working tree, no CI
`git status`: 331 modified + 46 deleted files. No `.github`/`.gitlab-ci`. 69 one-off QA/e2e/probe scripts committed (`e2e-*.js`, `ai-*.mjs`, `*-probe.mjs`, `*-verify.mjs`) hardcoding `Admin@123` and `localhost:3001`. **Fix:** stabilize tree, CI pipeline (lint/test/build/container scan), move/delete junk scripts.

## INF-06 · P1 — Secrets management
No Vault/SOPS; compose default DB password (`docker-compose.yml:10`); credentials in `.env.example:8`; default admin `Admin@123` in committed seed (`prisma/seed.ts:143,331`). **Fix:** require `ADMIN_PASSWORD` in prod seed; fail-fast config; secrets manager.

## INF-07 · P1 — Uploads not persisted in compose + no backup
Files written to `process.cwd()/uploads` (`local-file-storage.provider.ts:9`); no volume/bind. **Fix:** named volume + backup (Phase 8).

## INF-08 · P1 — Localhost rewrite default in frontend
`frontend/next.config.ts:14` rewrites `/api/v1/*` → `http://localhost:3001` default. Remote deploy without `NEXT_PUBLIC_API_URL` silently proxies to own localhost.

## INF-09 · P1 — Token handling weak
JWT tokens in `localStorage` (XSS-readable); middleware cookie stores only token **expiry** (forgeable presence marker, not credential) — `tokenStorage.ts:42,50`, `proxy.ts:17-22`. **Fix:** HttpOnly Secure cookies; server-side JWT verify in middleware; API guard remains the real control.

## INF-10 · P1 — Logging stdout-only; no rotation/aggregation
`nestjs-pino` to stdout (`app.module.ts:83`). **Fix:** log driver/collector.

## INF-11 · P2 — `/health` static, doesn't check DB
`health.controller.ts:7-17` returns static "ok"; real checker exists at `/monitor/health` but is JWT-gated. **Fix:** `SELECT 1` in `/health`; wire container healthcheck.

## INF-12 · P2 — `/monitor/metrics` stubbed
`monitor.service.ts:50-60` zeros; `recordRequest` never called. **Fix:** real counters.

## INF-13 · P2 — Swagger always on (SEC-18).

## INF-14 · P2 — No env separation (`.env` only); `NODE_ENV=development` baked in.
**Fix:** per-env override chain.

## INF-15 · P2/P3 — Base image unpinned (`postgres:16-alpine`); playwright in runtime deps (`backend/package.json:44`); middleware pathname logging in prod (`proxy.ts:14,19,22,26`).

---

# PHASE 8 — BACKUP & DISASTER RECOVERY

## Current state: NO BACKUPS EXIST, NOTHING VERIFIED
- No `pg_dump`/`pg_dumpall`/cron/scripts anywhere (grep = 0 hits).
- `docs/FINAL_ARCHITECTURE.md:511` plans `daily-backup 0 2 * * *` but no executor exists; `scheduler/` has only module+registry, no jobs.
- `settings.service.ts:182-186` seeds `backup.enabled/time/retentionDays` rows — inert config.
- Postgres named volume `postgres_data` survives restarts (the ONLY durability today). Uploads have zero coverage.

## Required backup strategy
1. **Frequency:** nightly `pg_dump -Fc` (custom format) + nightly tar of `backend/uploads/`.
2. **Retention:** 30 days on-server, plus 3 monthly off-server copies (per seeded settings).
3. **Off-server:** copy archives to a separate location (object storage / second host / cold drive) — never only on the DB host.
4. **Naming:** `elwataniya-db-<ISO-DATE>.dump` / `elwataniya-uploads-<ISO-DATE>.tar.gz`.
5. **Restore procedure (documented + scripted):**
   - DB: `pg_restore -j4 -d elwataniya_prod ./elwataniya-db-<date>.dump`
   - Uploads: extract tar to `backend/uploads/` (canonical path)
6. **MANDATORY:** a restore test into a **separate** database + separate storage location, then boot the app against restored data and verify login, projects, financials, files. **A backup that has never been restored is not verified.** This restore drill is a Phase 9 test item.

---

# PHASE 9 — PRODUCTION TESTING PLAN

Run against the live stack (backend + frontend + DB), with isolated test data, cleaned afterward:

1. **Typecheck/build:** frontend `tsc --noEmit`, `next build`; backend `tsc`, `npm run build`.
2. **Unit tests:** backend `vitest run` (existing: notification, extract-rules, etc.).
3. **Authorization matrix (per role):** SUPER_ADMIN, ADMIN/MANAGER, ACCOUNTANT, PROCUREMENT, normal employee, **unauthorized user**. Verify each permission-gated route: allow/deny exactly per RBAC. Include negative tests (403 expected).
4. **IDOR/BOLA:** user on project A attempts project B fund/stock/statement/extract/file read + write → denied.
5. **Security negative tests:** path traversal upload; SVG/HTML upload; oversized upload (413); unauthenticated `/pdf/render` (401 after fix); cloud-metadata SSRF (blocked); register disabled; conversation IDOR; signature-workflow forge.
6. **Financial consistency tests:** create extract → statement → payment; verify fund balance, ledger, stock; run concurrent double-purchase (no lost update); Decimal rounding on large sums.
7. **File upload tests:** allowed types accepted; disallowed rejected; download authorization; restore-after-replacement cleanup.
8. **AI security tests:** permission-gated tool calls; prompt injection attempts; tool-arg validation; no canned data in responses; audit-log presence for LLM-path mutations.
9. **Performance checks:** request latency before/after; Prisma `EXPLAIN ANALYZE` on indexed queries; dashboard query-count reduction; PDF render under load (memory cap).
10. **Backup/restore drill (Phase 8 item 6):** restore into fresh DB + storage, boot app, verify data.
11. **Recovery test:** kill containers → restart policies bring services back; `/health` reflects DB state; no orphan Chromium.

---

# PHASE 10 — FINAL REPORT SUMMARY

## Fixed during this audit session
- **Notifications (completed earlier):** `GET /notifications` supports `limit`/`read`; new `GET /notifications/unread-count`; `useUnreadCount` polls the count endpoint; Topbar lazy-loads with `limit=20`; admin feed uses `read=false&limit=10`; removed duplicate Topbar mount fetch. Verified: backend tsc, 21/21 notification tests, frontend tsc + eslint.

## Security hardening session (P0 fixes, in order)
- **P0 #1 — Live secrets removed:** deleted `.admintoken`, `tmp_token.json`, `tmp_token.txt`, `tmp_login.json`; emptied `OPENAI_API_KEY` in `backend/.env:12` (**must still rotate the key at OpenAI** — it was exposed).
- **P0 #2 — File uploads hardened:** new `src/modules/file/domain/file-security.constants.ts` (category allowlist, per-category MIME allowlist, 10MB cap, no SVG/HTML); `FileService.upload`/`uploadBase64` now enforce category + magic-byte MIME + size; `LocalFileStorageProvider` resolves paths with `resolve(basePath, path)` and throws on any escape (`../`, absolute paths); `FileInterceptor` limits on `/files/upload` + all 5 company uploads; downloads serve `attachment` for any non-safe-inline type and always send `X-Content-Type-Options: nosniff`; `UploadFileDto` enforces the category enum.
- **P0 #3 — `/pdf/render` SSRF + DoS closed:** removed `@Public()` (JWT + `files.read` required); strict `RenderPdfDto` with max sizes/counts (`512KB` total); `assertSafeUrl` SSRF guard (blocked private/loopback/link-local/metadata, DNS-resolve hostname check, non-http(s) rejected) applied to logoUrl/signature imageUrl; `resolveAssetUrl` drops unsafe URLs; `renderToPdf` has a 30s timeout; `PdfEngineService` caps concurrent renders (default 4).
- **P0 #4 — Public registration disabled:** `POST /auth/register` now requires `ALLOW_PUBLIC_REGISTRATION=true` (default `false` → 403). Documented in `.env.example`.
- **P0 #5 — Missing authorization added:** `@RequirePermission` on construction-analytics (`reports.read`), construction-bi (`reports.read`; `evaluate` also `reports.generate`), ai-agent (`profile.read`; analytics `reports.read`), signature-workflow (`profile.read`; workflow CRUD `reports.generate`). New migration `20260815090000_grant_report_permissions` + `seed.ts` grant `reports.read` to all internal staff roles and `reports.generate` to TECHNICAL_OFFICE/PROJECT_MANAGER/ACCOUNTANT.
- **P0 #6 — IDOR/BOLA closed:** `OwnershipService.verifyProjectAccess`/`verifyBuildingAccess` accept the full JWT user (`OwnershipActor`); the null/undefined cross-project bypass is removed — a user with no project assignment is denied; only `roleNames.includes('SUPER_ADMIN')` bypasses. All 48 call sites updated to pass the full user object; cascading use-case chains forward `user`. `ListProjectsUseCase`, `ListAllExtractsUseCase`, client-statement and subcontractor-statement lists are scoped by `user.projectIds` (empty assignment → empty list, no full-table leak).
- **Verification:** backend `tsc --noEmit` clean; `vitest run` 169/169 (incl. new `file-security.spec.ts`, `ssrf-guard.spec.ts`, `ownership.service.spec.ts`); `eslint` 0 errors (only pre-existing unused-import warnings).
- **P0 #7 — Backup & Recovery implemented and tested:** `scripts/backup/` provides `backup.{ps1,sh}` (pg_dump `-Fc` + uploads tar + retention pruning + optional `BACKUP_EXTERNAL_COMMAND` off-server copy), `restore-verify.{ps1,sh}` (restores into a throwaway staging DB, verifies 58 table counts + 8 deep checksums + file references + migrations parity, then drops the staging DB), `dr-restore.{ps1,sh}` (operator-confirmed DR restore), `schedule-windows.ps1` + `schedule-cron.example` (OS-scheduler, app not required). Config in `scripts/backup/backup.env` (git-ignored); `backups/` git-ignored. **Tested live:** BACKUP → RESTORE (separate DB) → 58/58 counts OK, checksums OK, 31 files manifest-identical → PASS; original DB unchanged, zero residue. Docs: `docs/PRODUCTION_BACKUP_RECOVERY.md`, `docs/FINAL_BACKUP_RECOVERY_REPORT.md`. Commands: `npm run backup`, `npm run backup:verify`. **Remaining gap:** `BACKUP_EXTERNAL_COMMAND` unset → local-only storage; must be configured in production.

## Security findings: 47 (10 P0, 10 P1, 17 P2, 10 P3)
## AI security findings: 3 P0, 4 P1, 7 P2, 3 P3 (folded into SEC numbering)
## Architecture findings: FIN-01 (P0) + 7 secondary
## Performance findings: 1 P0, 5 P1, 6 P2, 3 P3
## Database/financial findings: 8 (FIN-01..FIN-09)
## Files/uploads findings: 12 (SEC-02,03,04,13,14,15,17,31,32,33,34,43)
## Infrastructure findings: 15 (INF-01..INF-15)
## Backup/restore: NOT IMPLEMENTED, NOT VERIFIED
## Remaining risks: see full P0/P1 list above

## Top 10 actions to become production-ready (priority order)
1. Rotate/remove the live OpenAI key in `backend/.env`; delete `.admintoken`, `tmp_*` tokens; rotate the admin session. **(P0)**
2. Fix `/pdf/render`: require auth, strict DTO, block remote URLs + private IPs, timeouts, concurrency cap. **(P0)**
3. Fix file uploads: category allowlist + path containment, magic-byte MIME allowlist, file-size limits, ownership checks, safe public route (no SVG/HTML inline). **(P0)**
4. Close the auth bypasses: disable public `register`; add `@RequirePermission` to construction-analytics, construction-bi, ai-agent, signature-workflow, profile; scope list endpoints by `user.projectIds`; remove `OwnershipService` null bypass. **(P0/P1)**
5. Make extract/statement math a single backend source of truth; migrate the two Float money tables to Decimal; make all financial writes atomic with locking. **(P0/P1)**
6. Add DB indexes (Building.projectId, Statement.contractorBoqId, Payment.*, etc.) + paginate all list endpoints. **(P1)**
7. Implement backups (nightly pg_dump + uploads tar, off-server copy) and perform the restore drill. **(P0)**
8. Write production Dockerfiles (backend + frontend standalone), compose with volumes, resource limits, healthchecks, restart policies; graceful shutdown hooks. **(P0)**
9. TLS reverse proxy + Secure/HttpOnly cookies (attendance GPS/camera depend on HTTPS). **(P0)**
10. Stabilize the tree: CI pipeline, remove 69 committed probe scripts + default admin password, secrets validation fail-fast. **(P1)**

## Report artifacts
- This consolidated report: `docs/PRODUCTION_READINESS_AUDIT.md`
- Source-of-truth evidence gathered by six parallel read-only audits (session tool results).
