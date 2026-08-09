# P0-5 Phase 1 — Enterprise ERP Stabilization Analysis Report

> **Status:** Analysis complete. **No implementation performed yet** (per P0-5 rule: report first, DO NOT blindly implement).
> **Scope:** Full-system audit of `frontend/` (Next.js) + `backend/` (NestJS) with file:line evidence.
> **Date:** 2026-08-01

---

## 1. Confirmed Bugs (high priority)

### 1.1 Attendance override never reaches the backend (CONFIRMED — dead frontend route)
- `frontend/app/[locale]/(dashboard)/attendance/page.tsx:442` posts the override request to **`/api/attendance-override`** — a Next.js API route that does **not exist** (`frontend/app/api` is absent).
- The real backend endpoint is `POST /api/v1/attendance-override` (`backend/src/modules/attendance-override/attendance-override.controller.ts:35`).
- **Impact:** GPS-outside-site overrides are silently lost (404); managers never see the request. UI still shows "Override request submitted for manager approval".

### 1.2 AI conversation memory & context are in-memory only (CONFIRMED)
- `ConversationMemoryService` (`backend/src/modules/ai-agent/memory/conversation-memory.service.ts:13`) uses a `Map<string, MemoryEntry[]>`.
- `ContextEngineService` (`context-engine.service.ts:44`) uses a `Map<string, ErpContext>`.
- **Impact:** All conversation history, workflow state, and entity context are wiped on server restart, even though the frontend persists `ai_agent_conversation_id` in localStorage (`components/ai-agent/AiAgentChat.tsx:62`). Follow-ups after a restart silently lose context. There is **no persistence, no `/ai-agent/conversations` endpoint, and no conversation-management UI** (no list / rename / delete / search / pin).

### 1.3 Payment module is read/write-only (CONFIRMED)
- Backend `payment.controller.ts` exposes only `GET …/payments` and `POST …/payments` — **no `GET :id`, no `PATCH`, no `DELETE`**.
- Frontend `services/payment.service.ts` only has `list()` and `create()`; the payments page has no edit/delete actions.
- **Impact:** No way to correct or cancel a mis-entered payment.

### 1.4 Declared domain events that are never published (CONFIRMED)
- `FundTransactionCreatedEvent` is declared (`domain-events/events/fund.events.ts:3`) and a notification template exists (`notification-engine.service.ts:163`), but `fund-transaction` module contains **zero** `eventBus.publish` calls (grep confirmed).
- `PaymentApprovedEvent` declared (`payment.events.ts:16`) but `payment.use-cases.ts:123` only publishes `PaymentCreated`.
- `BOQUploaded`, `BOQUpdated`, `ProjectCompleted`, `ProjectStatusChanged` declared but have no publishers found.
- **Impact:** Notification engine + timeline never fire for fund transactions/payment approval; features appear broken.

### 1.5 Stock movements produce no events / notifications (CONFIRMED)
- `stock-movement` use-cases (`create-stock-movement.use-case.ts`, etc.) publish **no** domain events; no templates exist.
- **Impact:** No timeline entry or notification on issue/receive/transfer — inventory history invisible to the notification/timeline subsystems.

### 1.6 Purchase & project-fund are CRUD-only, no request workflow (CONFIRMED)
- `purchase`: use-cases = create/list/update/delete/update-status. No purchase-request approval cycle, no budget/treasury linkage.
- `project-fund`: use-cases = create/list/update/delete. No fund-increase request → review → approve → transfer → treasury update workflow.
- **Impact:** The P0-5 "request workflows" phases have no backend to build on.

---

## 2. Attendance & GPS (Phase 3 audit)

- Frontend flow is otherwise solid: GPS capture with high/low accuracy retry (`attendance/page.tsx:232-289`), haversine geofence (line 57-64), selfie capture, offline queue (`localStorage 'attendanceQueue'`), tamper checks (clock skew / VPN), late/early/overtime computation (lines 537-580).
- **Root cause of "Unable to detect location":** the guard at `attendance/page.tsx:233` — `if (!window.isSecureContext && hostname !== "localhost")` — **blocks geolocation entirely on non-HTTPS deployments** (e.g. LAN/IP access), which is typical for construction-site usage. Chrome also rejects `getCurrentPosition` on insecure origins regardless. There is **no manual-location fallback**, so check-in becomes impossible on such deployments.
- `geoFenceAvailable` is false when the selected building has no `latitude/longitude/allowedRadius` (line 263-272); distance check is skipped but no hard block — acceptable.
- Attendance override: see 1.1.

---

## 3. CRUD completeness matrix (backend controllers)

| Module | Routes | C/U/D complete? | Notes |
|---|---|---|---|
| supplier, client, inventory-item, warehouse, employee, department, category | 5 (list/get/create/patch/delete) | ✅ | |
| subcontractor | 5 | ✅ | |
| client-statement, subcontractor-statement | 5 | ✅ | soft-delete |
| extract | 5 (nested building/contractor) | ✅ | |
| **payment** | **2 (list/create)** | ❌ | missing get/update/delete (1.3) |
| fund-transaction | 5 | ✅ | but no event publish (1.4) |
| approval | 5 | ⚠️ | only approve/reject PATCH, no generic update/delete |
| attendance | 8 | ✅ | incl. check-in/out, stats/dashboard |
| shift, holiday, leave | 5 | ✅ | |
| notification | 6 | ✅ | read-all, mark-read, clear |
| project-board | 5 | ✅ | generic CRUD only |
| miscellaneous | 5 | ✅ | generic CRUD only |
| purchase | 5 (+status) | ⚠️ | no request workflow (1.6) |
| project-fund | 5 | ⚠️ | no request workflow (1.6) |
| stock-movement | 5 | ✅ | no events (1.5) |

No **dead buttons / missing endpoints** beyond the above were confirmed; all listed frontend services map to existing controllers.

---

## 4. BOQ workflow (Phase 7/8 audit)

- Frontend routes: `estimates/client` = **Employer BOQ**, `estimates/company` = **Analytical BOQ**, `estimates/final` = **Final BOQ** (confirmed in `estimates/page.tsx` cards).
- **No `final/[estimateId]` detail page** — the final BOQ is a single list per building (`estimates/final/page.tsx`, `docKey = final:${buildingId}`).
- **Final BOQ items have no `id` field** — they are keyed by `businessCode` / `itemCode` across all four BOQ entity types.
- Workflow features present: import from employer, analyze into components, distribute to subcontractors, edit item/component price, remaining-quantity tracking, CSV export, HTML print with signatures (`/components/boq/*`).
- Distribution uses `distributionService.distribute(buildingId, itemCode, componentId, distribution)` and is audited (`distribution.use-cases.ts:151`).
- **Gap:** no per-item read-only detail route; no bulk operations on final BOQ; final items keyed by code rather than stable id (business risk if codes change).

---

## 5. Notifications, Timeline, Audit, Domain events

- **Notification engine** subscribes to all events (`notification-engine.service.ts:24`) and renders templates; 13 templates registered (project/building/employee/purchase/approval×3/extract×2/payment/attendance×2/fund).
- **Published events (confirmed publishers):** ProjectCreated, BuildingCreated, EmployeeCreated, PurchaseCreated, ApprovalRequested/Approved/Rejected, AttendanceCheckedIn/Out, ExtractCreated/Approved, PaymentCreated, plus identity common publisher.
- **Timeline subscriber** records every event (`timeline.subscriber.ts:17`) with category mapping — good coverage for published events.
- **Audit:** global `AuditInterceptor` (`common/interceptors/audit.interceptor.ts`) logs all non-GET mutations to `auditLog`; BOQ/distribution use-cases add rich before/after audit entries. Adequate.
- **Dead events:** see 1.4; **stock movements** produce nothing (1.5).

---

## 6. Theme, Performance, Mobile

- **Theme:** custom `ThemeProvider` (no next-themes) + inline pre-hydration script in `app/layout.tsx:18-27` prevents FOUC. 
- **Hydration risk:** `ThemeProvider` initial `theme`/`resolved` derive from `localStorage` (client-only). `ThemeToggle` renders an icon from `resolved` without a mounted-guard → possible server("light") vs client("dark") mismatch. Low severity (inline script already sets the class, and `suppressHydrationWarning` is applied), but worth a mounted-guard.
- **Performance:** analytics service memoizes with `CACHE_TTL_MS = 60_000` (`analytics.service.ts:23`) — fine. Attendance page pulls full lists and filters client-side — acceptable at seed scale, flag for large datasets. Final BOQ renders the whole table with no virtualization — flag for very large BOQs.
- **Mobile:** attendance page is responsive; no PWA/service-worker; camera uses `getUserMedia` (HTTPS-only again).

---

## 7. ID leakage / hygiene (needs implementation-phase verification)

- No raw-UUID rendering confirmed in the pages audited; entity resolution prefers names in AI output. Final BOQ exposes `itemCode` (business code, intended). To be re-verified during implementation of each module.

---

## 8. Recommended implementation order (by business impact)

1. **P0-5 fix 1.1** — Attendance override: point frontend to `apiClient` → `POST /attendance-override`, align payload, add manager approval UI wiring.
2. **P0-5 fix 1.4 + 1.5** — Publish missing domain events (fund-transaction, payment-approve, stock-movement) so notifications + timeline work end-to-end.
3. **P0-5 fix 1.2** — AI conversation persistence: DB-backed memory + `/ai-agent/conversations` CRUD + conversation management UI.
4. **P0-5 fix 1.3** — Payment update/delete endpoints + UI.
5. **P0-5 fix 1.6** — Purchase & fund-increase request workflows (backend use-cases + approval engine hookup + UI).
6. **P0-5 attendance GPS** — Manual location fallback + clear HTTPS guidance.
7. **P0-5 theme** — Mounted-guard in `ThemeToggle`.
8. **P0-5 BOQ** — Final BOQ item detail/robust id handling if warranted.
9. E2E verification per module (mirroring the P0-4 verification approach).

---

## 9. Next step

Awaiting approval to begin implementation. No code has been changed in this phase.
