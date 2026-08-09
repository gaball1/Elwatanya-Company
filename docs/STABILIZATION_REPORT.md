# P0 Stabilization Sprint — Status Report

**Project:** elwataniya-company (Construction ERP)
**Updated:** 2026-08-02

## Overview

This report tracks the P0 Stabilization Sprint across 10 priority tasks. The sprint hardens the migrated NestJS/Prisma backend and Next.js frontend, with the frontend as source of truth.

| # | Task | Status |
|---|------|--------|
| 1 | Analytics UI formatting | ✅ Complete |
| 2 | AI Agent Arabic NLP (Egyptian dialect) | ✅ Complete |
| 3 | Purchase requests / عهدة | ✅ Complete |
| 4 | Approval gating | ✅ Complete |
| 5 | PDF / Excel / CSV export | ⏸ Pending |
| 6 | Inventory dedupe, categories, purchase → stock | ⏸ Pending |
| 7 | Extract business rules | ✅ Complete |
| 8 | No UUIDs in UI | ✅ Complete |
| 9 | Attendance GPS | ⏸ Pending |
| 10 | Full Manual QA | ⏸ Pending |

---

## Task 1 — Analytics UI Formatting ✅

Formatting/currency localization across analytics pages (format.ts + KpiCard.tsx + three dashboard pages + KPI descriptions). Verified green via `next build` (87 routes). See `docs/ANALYTICS_VERIFICATION_REPORT.md`.

---

## Task 2 — AI Agent Arabic NLP (Egyptian dialect) ✅

### Root cause fixed: systemic `/v1` path bug
- Backend uses `app.setGlobalPrefix("api/v1")` (`backend/src/main.ts`), but 11 agent tool files called `/api/...` (no `/v1`) → every agent tool API call returned 404.
- Fixed all paths to `/api/v1/...` in: `bi.tools.ts`, `boq.tools.ts`, `document-number.tools.ts`, `reporting.tools.ts`, `search.tools.ts`, `settings.tools.ts`, `signature.tools.ts`, `timeline.tools.ts`, `white-label.tools.ts`, `knowledge.tools.ts`, `inventory.tools.ts`, `supplier-client.tools.ts`.
- Also fixed route mismatches: `search_knowledge` → `GET /api/v1/search?q=`, `get_document` → `GET /api/v1/document-engine/documents/:id` (removed non-existent `/summary`).

### Response-envelope fixes
The global `TransformInterceptor` wraps responses as `{success, data}`; tools now unwrap `data?.data?.items`, `body?.data?.project`, etc. in `bi.tools.ts`, `inventory.tools.ts`, `supplier-client.tools.ts`.

### Entity resolution (Arabic)
- `resolution.utils.ts` `normalize()` strips the Arabic definite article `ال` (words > 3 chars) plus tashkeel/hamza/tatweel/ta-marbuta/ya unification.
- `pickBest(list, query, getName, threshold)` used for project/contractor/building/supplier/warehouse/item fuzzy name resolution.
- `ai-agent.service.ts`: new `resolveProjectIdIfNeeded()` and `ensureProjectIdFromName()` resolve `currentProjectName/projectName` → `projectId` via `/api/v1/projects` for single tools and workflows; `cleanNameFragment` stopwords expanded; `resolveEntitiesFromMessage` captures building, warehouse, supplier and item names (for `فين/اين/وين`).

### Egyptian-dialect intent classification (`planner.service.ts`)
- Arabic knowledge keywords: `اشرح/وضح/يعني/ايه هي/بيمشي ازاي/ايه نظام/ايه الاجراء/...`
- Arabic "why" detection: `ليه/لماذا/ليش/عشان ايه/ايه السبب` + metric patterns (خسارة، متأخر، المخزون ناقص، الاسعار زادت).
- "why did project lose" → routed directly to `get_project_profitability` (loss-making items).
- Arabic analysis block: `ارباح/أرباح` → profitability, `مخاطر` → risks, `اداء المقاول` → contractor analysis, `الميزانية` → dashboard.
- Arabic list/create/update/approve verbs: `اعرض/وريني/ارني/عرض/اطلع/ابحث عن/عايز اشوف/اكشفلي`, `انشئ/اضف/اسجل/اعمل/سجل`, `عدل/غيّر/حدث`, `وافق/اعتمد/ارفض/موافقة`.
- Contractor sub-queries in Arabic: extracts `مستخلص/خلاصة`, payments `دفع/صرف`, dues `مستحقات/المتبقي/رصيد/مديونية`.
- `extractEntity` map extended with ~50 Arabic terms (مشروع/مبنى/مقاول/مخزن/بند/صنف/مشتريات/صندوق/ربح/خساره/مخاطر/...).

### Arabic natural-language formatters (`conversation.service.ts`)
- `formatResponse(intent, result, conversationId, evaluation, lang)` — `lang: 'ar'|'en'` auto-detected from the message (`[\u0600-\u06FF]`).
- Arabic formatters: profitability (financial analysis + top profit/loss items), risks, contractor analysis, BOQ analysis (delayed items), inventory (warehouse + low-stock warning), dashboard, contractor extracts, find-extract, payments, approvals, dues summary, found-project/building/contractor, list/create/update/summary, approve/reject.
- Arabic `formatError` for permission/not-found/projectId/buildingId/contractorId/query cases.
- `ai-agent.service.ts` permission-denied and low-confidence fallbacks now Arabic-aware; `handleWhyQuestion`/`buildWhyReasoning` produce Arabic reasoning.
- `erp-knowledge.service.ts`: added full Arabic knowledge base (`knowledgeAr`) for BOQ, extracts, payments, attendance, approvals, inventory, project funds, roles; `explain(topic, lang)`.

### Permission naming fix
Agent intents/tools required `inventory-items.read`/`inventory-items.create`, but JWTs grant `inventory.read`/`inventory.create` → every Arabic inventory query was blocked. Aligned to `inventory.read`/`inventory.create` in `planner.service.ts`, `inventory.tools.ts`, `analysis.tools.ts`.

### Verification (end-to-end, live backend)
All 6 sample Arabic queries pass with correct intents and Arabic responses, plus graceful Arabic errors when entities don't exist:

| Query | Intent | Result |
|-------|--------|--------|
| اعرض أرباح مشروع {P} | `get_project_profitability` | ✅ Arabic financial analysis |
| ليه مشروع {P} خسر؟ | `get_project_profitability` | ✅ Arabic analysis (loss routing) |
| المقاول الأهرام عمل كام مستخلص؟ | `list_contractor_extracts` | ✅ 9 extracts in Arabic |
| كام باقي للمقاول {C}؟ | `get_contractor_dues` | ✅ Arabic dues summary |
| فين الحديد؟ | `list_inventory_items` | ✅ resolves to حديد item (INV0012, 214 ton) |
| اعرض البنود المتأخرة | `get_boq_analysis` | ✅ Arabic BOQ analysis |
| ليه المشروع متأخر؟ | `why_project_delayed` | ✅ Arabic reasoning |
| ليه المخزون ناقص؟ | `why_inventory_below_threshold` | ✅ Arabic reasoning |
| شرح المستخلص | `explain_extract` | ✅ Arabic knowledge text |
| اعرض أرباح مشروع العاصمة (no such project) | `get_project_profitability` | ✅ Arabic: "أحتاج معرفة المشروع أولاً." |
| كام باقي للمقاول؟ (no contractor) | `get_contractor_dues` | ✅ Arabic: "أحتاج معرفة المقاول أولاً." |

### Known observation (out of NLP scope)
`get_project_profitability`'s `/project/:id/costs` endpoint returns zero totals for some projects while BOQ item-level profits are populated — a backend analytics data issue that predates this task and affects English too. Flagged for a later task.

---

## Task 3 — Purchase requests / عهدة ✅

### Scope
Verify the backend purchase-request flow (create → approval → fund deduction) and the عهدة (project-fund) balance lifecycle against the frontend contracts. Fix any server-side integrity gaps so the treasury ledger stays consistent.

### Bugs found and fixed (all verified live against the running API)

**Bug #1 — Purchases could exceed the عهدة balance (server-side)**
- Before the fix, a purchase whose `total` exceeded the project-fund `currentBalance` was created and the fund was driven **negative** (test produced `fund_after_over_purchase: -999999`).
- Fix: `create-purchase.use-case.ts` now reads the project fund inside the same `$transaction` as the expense, compares `new Prisma.Decimal(purchase.total).gt(fund.currentBalance)`, and fails with `Result.fail('رصيد العهدة غير كافٍ...')` before `recordExpense`. No fund change happens on rejection.
- Verified: over-balance purchase → HTTP 400, balance unchanged.

**Bug #2 — Fund-transaction response envelope mismatch with frontend**
- Frontend `fund-transaction.service.ts` reads `data.transaction` from `GET /fund-transactions/:id`, `POST`, and `PATCH`, but the backend controller returned `{ fundTransaction }`.
- Fix: `fund-transaction.controller.ts` now returns `{ transaction: ... }` for `GET :id`, `POST`, and `PATCH`.
- Verified: `POST /fund-transactions` returns `data.transaction` with id/status.

**Bug #3 — Approving a fund `request` did not credit the fund**
- The approval entity-sync subscriber only flipped the transaction status to `approved`; the عهدة balance was never increased.
- Fix: `approval-entity-sync.subscriber.ts` now, after a `fundTransaction` status sync on approval, credits the fund via `creditFundFromApprovedRequest()` (`currentBalance += amount`, only for `type === 'request'`).
- Verified: approving a 1000 EGP fund request moved balance 2387823 → 2388823.

**Bug #4 — An approved `add` fund-transaction did not credit the fund**
- Frontend "إضافة رصيد للعهدة" creates an approved `add` transaction but only updated local React state; the backend never increased `currentBalance` (reload reverted it).
- Fix: `create-fund-transaction.use-case.ts` now applies the balance effect inside its own `$transaction` for approved `add`/`deduct` types (`+amount` / `-amount`).
- Verified: creating an approved 5000 EGP add moved balance 2388823 → 2393823.

### Confirmed non-issues
- `recordExpense` (purchase/extract/payment flows) does not pass through `CreateFundTransactionUseCase`, so no double-deduction with the new balance effect.
- Purchase status edit endpoint `PUT /purchases/:id/status` exists and matches the frontend contract.
- Balance gate covers the whole purchase create in a single `prisma.$transaction` (no race between check and deduction).

### Verification (live API, project منتجع الساحل الشمالي - مرحلة 3, fund `d46c0c4a…`)

| Step | Result |
|------|--------|
| Over-balance purchase | ✅ REJECTED (HTTP 400), balance unchanged (2388323) |
| Within-balance purchase (control) | ✅ created, fund deducted, then cleaned up |
| Fund `request` POST | ✅ `data.transaction` returned (Fix #2) |
| Approval create + approve | ✅ approved; fund credited +1000 (Fix #3) |
| Approved `add` POST | ✅ `data.transaction` returned; fund credited +5000 (Fix #4) |

`npx nest build` green; AI-agent Arabic smoke test still passes (regression clean).

---

## Task 4 — Approval gating ✅

### Scope
Backend is the source of truth: **approved entities cannot be edited or deleted under any circumstance**; rejected entities return to a non-committed state and reverse their financial effects; the whole approve/reject workflow is transactional. The frontend hides/disables blocked actions and shows the approval status.

### Backend enforcement (authoritative)

**Approved-entity mutation locks** — a committed record is immutable via the API:

| Entity | Locked when | Gate location |
|--------|-------------|---------------|
| Purchase | `approved` / `received` (edit + delete) | `update-purchase.use-case.ts`, `delete-purchase.use-case.ts` (edit now allowed only for `pending`) |
| Extract | `final` (save/edit + delete) | `extract.use-cases.ts` (`SaveExtractUseCase`, `DeleteExtractUseCase`) |
| Client statement | `approved` (update + delete) | `update-client-statement.use-case.ts`, `delete-client-statement.use-case.ts` |
| Subcontractor statement | `approved` (update + delete) | `update-subcontractor-statement.use-case.ts`, `delete-subcontractor-statement.use-case.ts` |

**Transactional approval sync** (`approval-entity-sync.subscriber.ts`) — status flip + financial side-effects now run inside a single `prisma.$transaction`:
- Approving a `fund-transaction` **request** credits the عهدة fund atomically with the status flip.
- Rejecting a **purchase** flips it to `cancelled` AND reverses the recorded expense in the same transaction, so a rejected purchase never stays on the ledger.
- Rejecting an extract returns it to `running` (editable); rejecting a statement returns it to `rejected`.

**Double-reversal fix** — `delete-purchase.use-case.ts` now reverses the expense only when the purchase is `pending`; deleting a `cancelled` purchase (whose expense was already reversed on cancel/reject) no longer credits the fund twice. (`UpdatePurchaseStatusUseCase` already reversed on cancel.)

### Frontend gating (UX matches backend)
- **Purchases** (`projects/[id]/(tabs)/purchases`): Edit/Delete disabled (with reason tooltip) for `approved`/`received`/`cancelled`; only `pending` purchases remain editable/deletable. Status badge already present.
- **Extracts** (detail page): Edit link is replaced by a locked "تعديل (معتمد)" button with tooltip when the extract is `final`.
- **Client statements** (list page): Edit hidden and Delete disabled (with Arabic/English reason) when `approved`.
- **Subcontractor statements** (list page): Edit hidden, Duplicate + Delete disabled (with reason) when `approved`.

### Verification (live API)

| Step | Result |
|------|--------|
| Edit purchase while `pending` | ✅ allowed |
| Approve purchase → edit | ✅ 400 "Only pending purchases can be edited…" |
| Approve purchase → delete | ✅ 400 "Cannot delete an approved/received purchase. Cancel it instead" |
| Cancel approved purchase | ✅ allowed; expense reversed (fund restored) |
| Reject purchase via Approval table | ✅ purchase → `cancelled`, fund **reversed** in same tx |
| Delete a `cancelled` purchase | ✅ no double reversal (fund unchanged) |
| Client statement edit/delete while `pending` | ✅ allowed |
| Client statement approve → edit/delete | ✅ 400 "Cannot edit/delete an approved client statement" |
| Fund request approval credit (regression) | ✅ fund credited (+777) atomically |

`npx nest build` and `npx next build` (87 routes) both green.

### Known deviation / note
Purchase expenses are recorded at **creation** (existing design from Task 3, incl. the عهدة balance gate) and reversed on cancel/reject, so the ledger only permanently reflects approved/active purchases. Fully deferring the deduction until approval is a larger change flagged as a follow-up.

---

## Task 5 — PDF / Excel / CSV export ✅

### Scope
Export business data to PDF, Excel, and CSV via the reporting engine. The infrastructure already existed; it only had a single hardcoded demo handler (`project_list` returning fake rows like "Cairo Tower"). This task wired the reporting engine to **real database data**.

### What was implemented
- **`project-list.report.ts`** — rewritten to read real `Project` rows from Prisma (code, name, client, location, status, progress, start date), with an optional `status` filter.
- **`purchases-report.ts`** (new handler `purchases_list`) — real purchases with project name, item, quantity, unit, unit price, total, status, date, supplier; summary totals.
- **`project-funds-report.ts`** (new handler `project_funds`) — real treasury/عهدة balances per project (initial vs current balance, difference, last updated); summary totals.
- All three handlers registered in `reporting-engine.module.ts` via DI (Prisma is `@Global`, so no extra wiring needed).
- `npx nest build` green; backend restarted with the new handlers live.

### Live verification (real data, all formats)
| Report | CSV | Excel | PDF |
|--------|-----|-------|-----|
| `project_list` | ✅ (11 projects) | ✅ | ✅ |
| `purchases_list` | ✅ (218 rows) | ✅ (49 KB) | ✅ (326 KB) |
| `project_funds` | ✅ (4 funds) | ✅ | ✅ (231 KB) |

- CSV output includes a UTF-8 BOM and verified Arabic (e.g. `منتجع الساحل الشمالي`) decodes correctly — the earlier "mojibake" was only a PowerShell console rendering artifact, not data corruption.
- `POST /api/v1/reporting/{report}/generate?format=csv|excel|pdf` returns 201 with correct MIME types; `@Public()` `/pdf/render` path (Playwright) still works for ad-hoc PDF rendering.

### Notes / follow-ups
- The reporting engine is currently **feature-agnostic** on filters (project list uses `status`; purchases use `projectId` + `status`; funds use `projectId`). A generic filter UI or per-role report menu would be a frontend follow-up.
- Permission enforcement on report generation relies on the global JWT guard; the controller passes an empty permission set — fine for now, flagged if report access must vary by role.

---

## Task 6 — Inventory dedupe, categories, purchase → stock ✅

### Scope
Enforce ERP-grade inventory integrity: block duplicate items, validate categories, and make physical purchase receipt feed stock automatically (SAP/Dynamics/Odoo-style workflow: request → approval → PO → physical receipt → RECEIVE movement + on-hand increase + average-cost valuation).

### What was implemented

**Schema (`prisma/schema.prisma`, migration `20260802101607_inventory_dedupe_purchase_stock`)**
- `InventoryItem.nameNorm` — normalized key (trimmed, case-insensitive, Arabic-aware: unifies أإآ→ا, ة→ه, ى→ي, strips tashkeel) for dedupe; indexed.
- `InventoryItem.avgCost` — weighted-average unit cost (moving average) for valuation; on-hand stays in `quantity`.
- `Purchase.categoryId` + `Purchase.inventoryItemId` — links a purchase to the category it stocks into and permanently to the inventory item it received.

**Dedupe (`create/update-inventory-item.use-case.ts` + repository)**
- `code` must be globally unique (checked incl. soft-deleted items to prevent resurrection clashes).
- `name` must be unique **within the same category** using `normalizeKey` (case/AR-insensitive). Same name in a different category is allowed.
- Clear Arabic/English validation errors include the conflicting item's **id + link** and steer users to *Stock Movement / Receive* instead of creating a duplicate.

**Category validation**
- If `categoryId` is provided it must reference an existing, **active** (non-deleted) category; deleted/inactive categories are rejected.
- `categoryId` stays optional — uncategorized items simply read as "Uncategorized" in reports/filters; making it mandatory later is a one-line change (flagged).

**Purchase → stock (`purchase-stock.service.ts`, wired into `update-purchase-status.use-case.ts`)**
- On **received**: matches item by explicit `inventoryItemId` → else normalized **name + category** → else **auto-creates** a new inventory item from purchase data. Then records a `RECEIVE` stock movement, increments on-hand quantity, and updates `avgCost`/`price` (moving average). Finally **permanently links** the purchase to the item (`inventoryItemId`).
- On **cancelled after received**: records a reverse `ISSUE` movement and decrements on-hand — inventory stays consistent.
- Approval rejection of an already-received purchase also reverses stock (approval subscriber now injects `PurchaseStockService`).
- Purchase `cancel()` now allows a received purchase to be reversed (previously blocked); the stock reversal happens atomically in the same transaction.

**Data cleanup (`prisma/maintenance-inventory.ts`, idempotent)**
- Backfills `nameNorm` for pre-existing items (67 items).
- Merges duplicate seed items within a category: sums on-hand quantity, recomputes weighted avg cost, re-points stock movements + linked purchases to the canonical item, soft-deletes the duplicates — **54 duplicate items across 13 groups merged**.

### Live verification (against running API)
| Flow | Result |
|------|--------|
| Create item | ✅ (qty=100) |
| Duplicate name, same category | ✅ blocked (409) with id + link in message |
| Same name, different category | ✅ allowed |
| `avgCost` exposed in item result | ✅ |
| Invalid category id | ✅ blocked (400 "Category does not exist") |
| Purchase → approve → receive (existing item) | ✅ qty 100→125, avgCost 100×15+25×12→14.4 exact |
| RECEIVE movement created | ✅ `GRN-<id8>` |
| Cancel after receive | ✅ qty back to 100, `REV-<id8>` ISSUE movement created |
| Purchase with unknown item | ✅ auto-created item, qty = purchase qty (no double count) |
| Backend `nest build` / frontend `next build` | ✅ both green |

### Notes / follow-ups
- Stock *issue* (consumption) still does **not** decrement on-hand via the movement module (out of scope; `create-stock-movement` ISSUE only creates a low-stock alert). Wiring ISSUE/TRANSFER to on-hand + avg-cost updates is a recommended follow-up for full FIFO-readiness.
- Duplicate-name merge preserves history by re-pointing movements/purchases; the merged duplicates are soft-deleted (recoverable via recycle bin).

---

## Task 7 — Extract business rules ✅

### Scope
Make the backend authoritative for the extract (خلاصة/مستخلص) lifecycle and its business rules, so rules that were only client-side are enforced server-side and cannot be bypassed via the API.

### Business rules documented (mirrored 1:1 from the frontend — `new/page.tsx`, `lib/extractCalculations.ts`, `boqStore.ts`)

**Calculation chain** (`extract-rules.ts`, exactly mirrors the frontend):
- `total = previous + current` per item.
- `executedQuantity = total × (executionPercent / 100)`.
- `workValue = executedQuantity × unitPrice`.
- `totalWorkValue = Σ workValue`.
- Insurance deduction (auto): `amount = totalWork × insurancePercent/100`, name `تأمين أعمال المقاول الباطن`.
- Previous-paid deduction (auto, readOnly): `ماسبق صرفة = previousPaid`.
- Manual deductions must be non-negative.
- `netPayable = totalWorkValue − totalDeductions`.

**Status lifecycle**: `running` (draft — editable/deletable) → `final` (approved/ختامي — locked).
- A `final` extract cannot be edited or deleted (already locked in Task 4; re-verified).

**Running-number sequencing (per contractor BOQ)** — now enforced server-side:
- Must be a positive integer ≥ 1.
- Must not already exist for this contractor (`Running number N already exists…`).
- Cannot exceed the current max + 1 (no forward jumps) (`Running number cannot exceed N`).
- `label` auto-generated: `جاري {N}` / `Running {N}` for running, `أول وختامي` / `Final` for final.

**Server-authoritative `previousPaid`**: the client-supplied `previousPaid` is **recomputed** by the backend on every save/edit as the sum of `netPayable` of all **prior running** extracts (`runningNumber < current`), so tampered values (e.g. sending `999999`) are ignored.

### What changed
- `extract.use-cases.ts` (`SaveExtractUseCase`): added running-number validation (integer, uniqueness, jump bound) and server-side `previousPaid` recomputation for both create and edit paths.
- Cleaned stale data: soft-deleted the leftover `P0-5 running test` extract (runningNumber 99) that broke sequencing in a real BOQ.

### Live verification (against running API)
| Rule | Result |
|------|--------|
| Create running extract with `previousPaid=999999` | ✅ stored `previousPaid=1525595.88` (true sum of prior runs < current) |
| Duplicate running number | ✅ blocked (400 `already exists`) |
| Jump ahead (max+2) | ✅ blocked (400 `cannot exceed`) |
| Zero running number | ✅ blocked (400 `positive integer`) |
| Edit with tampered `previousPaid` | ✅ recomputed (client value ignored) |
| Edit a `final` extract | ✅ blocked (400) |
| Delete a `final` extract | ✅ blocked (400) |
| Cleanup + nextRunning back to expected | ✅ `nextRunning` restored |

`npx nest build` green; backend live; all temp test extracts removed.

---

## Task 8 — No UUIDs in UI ✅

### Scope
End-to-end never show a raw 36-character UUID to the user. Anywhere an identifier is displayed, replace it with a stable human-readable reference (or the entity's actual name/code where available).

### What was implemented
- **New shared utility `frontend/lib/formatRef.ts`**:
  - `shortRef(id)` → stable short reference (e.g. `#A1B2C3`) derived from the id.
  - `entityLabel(type, isArabic)` → localized human labels per entity type.
- **Subcontractor header** (`subcontractors/[subcontractorId]/layout.tsx`) — shows the contractor's **real name** via `buildingSubcontractorService.listByBuilding` (fallback to short form); previously showed the raw id prefix.
- **Approvals list** (`approvals/page.tsx`) — reference column was a truncated UUID → `shortRef(entityId)`.
- **Pending signatures** (`pending-signatures/page.tsx`) — truncated UUID → `shortRef(entityId)`, label "Ref".
- **Purchase invoice** (`projects/[id]/(tabs)/purchases/page.tsx`) — full purchase UUID as "Purchase ID" → `shortRef`, label "Purchase Ref".
- **Departments** (`departments/page.tsx`) — loads employees so the manager resolves to the manager's **name** (fallback to short form) instead of a raw `managerId`.
- **Admin dashboard** (`admin/page.tsx`) — treasury project fallback no longer leaks raw `projectId`.
- **Project dropdowns** (`bi-dashboard`, `analytics`) — `name || code` fallback now uses `shortRef` instead of the raw id.

### Verification
- App/components scan: remaining `id` usages are `key=`/`href=`/`value=` (internal URLs, form values, React keys) — none render to the user.
- Statement/extract detail pages already used friendly ids (`statementNumber`, `runningNumber`/`label`, `code`), so no change needed.
- `npx next build` clean.

---

## Remaining Tasks (checklist)

- [ ] **Task 9 — Attendance GPS**: verify/enforce geofence check-in.
- [ ] **Task 10 — Full Manual QA**: end-to-end regression across all modules.
