# PROJECT_PLAN.md — El Wataniya Construction ERP

## Completed Work

### Foundation (Phase A)
- [x] Monorepo workspace (frontend/ + backend/)
- [x] NestJS 11 + Prisma 6 + PostgreSQL 16 + Docker
- [x] JWT authentication + RBAC guards
- [x] Global validation + exception filter + logging
- [x] Swagger documentation
- [x] User/RefreshToken schema

### BOQ Pipeline (Phase C)
- [x] Employer BOQ CRUD (list, upsert, replaceAll)
- [x] Analytical BOQ CRUD (list, replaceAll, update, remove, importFromEmployer)
- [x] Final BOQ (list, syncFromAnalytical, importFromEmployer, update, updateQuantity, remove, analyze, addComponent, updateComponent, removeComponent)
- [x] Contractor BOQ (list, getMeta, setMeta, allocate, updateQuantity, remove, available)
- [x] Distribution (distribute)

### Entity Extensions (Phase B)
- [x] **Project** — location, description, client, startDate, status, progress
- [x] **Building** — code, type, startDate, description, status
- [x] **Subcontractor** — workType, marginType, marginValue, phone, email, address, joinDate, status + full CRUD

### Sprint 1 — Client & Supplier (complete)
- [x] **Client** — backend module + frontend service + page (mockData → API)
- [x] **Supplier** — backend module + frontend service + page (mockData → API)

### Sprint 2 — Role, Department, Employee (complete)
- [x] **Role** (EmployeeRole) — CRUD with permissions
- [x] **Department** — CRUD with manager
- [x] **Employee** — CRUD with department/role relations

### Sprint 3 — Attendance, Leave, Holiday (complete)
- [x] **Holiday** — CRUD
- [x] **Leave** — CRUD
- [x] **Attendance** — CRUD with unique [employeeId, date]

### Sprint 4 — Inventory & Warehouse (complete)
- [x] **Warehouse**, **Category** (self-referencing), **InventoryItem**, **StockMovement** — CRUD + relations

### Sprint 5 — Treasury & Financial (complete)
- [x] **ProjectFund** — CRUD
- [x] **FundTransaction** — CRUD
- [x] **Miscellaneous** — CRUD

### Sprint 6 — Notification & Dashboard & Project Board (complete)
- [x] **Notification** — CRUD + read state (mockData → API)
- [x] **ProjectBoard** — CRUD

### Sprint 7 — Client & Subcontractor Statements (complete)
- [x] **ClientStatement** — CRUD (mockData → API)
- [x] **SubcontractorStatement** — CRUD (mockData → API)

### Enterprise Hardening (complete)
- [x] **Phase A — Authentication**: JWT access + refresh tokens with rotation, token family reuse detection, forgot/reset/change password, bcrypt hashing
- [x] **Phase B — RBAC**: Permission entity, Role ↔ Permission M2M, User ↔ Role M2M, `@RequirePermission()`, global `PermissionGuard`, permissions in JWT, frontend permission-aware UI
- [x] **Phase C — Error handling**: `ApiResponse` format, `TransformInterceptor`, `GlobalExceptionFilter` (VALIDATION_ERROR/FORBIDDEN/NOT_FOUND/CONFLICT/INTERNAL_ERROR), frontend `apiClient.unwrapResponse()`
- [x] **Phase D — Audit**: AuditLog model, AuditService, GET /audit (paginated), /audit/entity, auth lifecycle logging
- [x] **Phase E — Activity timeline** via audit entity endpoint
- [x] **Phase F — Soft delete & Recycle Bin**: `deletedAt` on critical models, recycle-bin list/restore/permanent-delete
- [x] **Phase G — Pagination**: `PaginationParams`, `PaginatedResult<T>`, `paginate()`
- [x] **Phase H — Performance**: Prisma indexes, rate limiting
- [x] **Phase I — Security**: Helmet, ThrottlerModule, CORS, class-validator DTOs, parameterized queries, Bearer auth
- [x] **Phase J — Logging**: nestjs-pino structured logging, LoggingInterceptor
- [x] **Phase K — Testing**: DDD-lite architecture, repository pattern
- [x] **Phase L — Documentation**: Swagger on all DTOs/endpoints, PROJECT_PLAN.md/PROJECT_MAP.md/SYSTEM_FLOW.md

### Advanced Modules (complete)
- [x] **Purchases** — purchase orders, statuses, company scoping (`20260728110000_add_purchases_module`, `20260808174053_add_purchases_company_permissions`)
- [x] **Approvals** — approval model, workflow (`20260729141505_add_approval_model`)
- [x] **Shifts & Attendance GPS** — geofencing, shift overrides, GPS check-in (`20260729191401_add_attendance_gps`, `20260730113917_add_attendance_extended_fields`, `20260730115625_add_shift_geofencing_override`, `20260802114940_add_override_snapshot`)
- [x] **Company / White-label** — company model, branding, public asset URLs (`20260730205746_add_company_model`, `20260809180000_public_company_asset_urls`)
- [x] **User signatures & verification** — user signature, verification hash (`20260730210135_add_user_signature`, `20260731111316_add_verification_hash_and_company_signature`)
- [x] **Document Engine & PDF Engine** — templates, rendering, PDF generation (`20260730210924_add_document_engine`)
- [x] **Signature Workflow** — document signing flows
- [x] **Document Numbering** — configurable document number formats (`20260728101200_add_boq_code_counter`)
- [x] **User ↔ Project assignment**, `employeeId` on users (`20260729100000_add_user_employeeId`, `20260729100754_add_user_project_assignment`)
- [x] **Construction Analytics & BI** — KPIs, dashboards, executive reporting
- [x] **Reporting Engine** — generated reports (PDF/Excel/CSV)
- [x] **Import/Export**, **Search Engine**, **Timeline**, **File storage** (mime validation, `20260809170000_fix_file_mime_types`)
- [x] **Notifications engine**, **Monitor**, **Scheduler**, **Queue**, **Domain events**
- [x] **Miscellaneous invoices** — `invoiceFile` on miscellaneous (`20260809152400_add_misc_invoice_file`)

### AI Agent — LLM-First Rebuild (complete)
- [x] LLM provider abstraction (`llm/llm-provider.interface.ts`, `openai-compatible.provider.ts`, `llm-provider.service.ts`, `llm-config.service.ts`, `agent-prompt.builder.ts`, `llm.types.ts`, `llm-agent.service.ts`) — fetch-based, no new runtime deps
- [x] Tool parameter schemas + Arabic-aware routing (`tools/tool-schemas.ts`)
- [x] LLM-first orchestration in `ai-agent.service.ts` with deterministic fallback when no API key
- [x] Robust Arabic/Egyptian deterministic fallback in `planner.service.ts` (normalization, dialect synonyms, definition/who/list/cashflow/BOQ branches)
- [x] Response composition in Arabic/English
- [x] Eval suite `prisma/eval-ai-arabic.ts`: 61 Arabic/Egyptian questions × {intent, ground-truth numbers, Arabic response, no-UUID, no-placeholder} assertions — **323/323 passing**
- [x] Env config: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `AI_AGENT_API_URL` (replaces hardcoded localhost:3001)
- [x] Unit tests: `planner.service.spec.ts`, `ai-agent.service.spec.ts` (12 + 10 cases)

### Tooling & QA (complete)
- [x] Backend ESLint 9 + typescript-eslint flat config (`eslint.config.mjs`) — `npm run lint` passes (0 errors)
- [x] Backend `tsconfig.json` `ignoreDeprecations` fix for TypeScript 6/7 deprecations
- [x] `vitest` test suite green (126 tests across 15 files) — includes domain/use-case coverage for purchase lifecycle, purchase-stock receipt/reversal, attendance-override same-row check-out, approval scoping, project-board documents, and RBAC notification delivery
- [x] Frontend + backend compile with zero TypeScript errors

### Hardening Round 3 — approvals scoping, board documents, permissions (complete)
- [x] **Approvals scoping**: list/get-by-id now restrict non-manager viewers (`approvals.read` only) to their own `requestedBy` requests; managers (`approvals.approve`) keep the company-wide list — regression was leaking all requests to every reader
- [x] **Approval audit trail**: `approval.approved` / `approval.rejected` audit entries (entity, requester, comment, IP) via `AuditService`
- [x] **Project board documents**: real file storage (upload/download), per-building board document list, metadata + soft-delete; migration `20260813211226_add_project_board_documents`
- [x] **Board/files permissions wired**: `TECHNICAL_OFFICE` → `project-boards.*` + `files.*`, `PROJECT_MANAGER` / `SITE_ENGINEER` → `project-boards.read` + `files.read` (in `seed.ts` + idempotent `prisma/grant-board-permissions.ts`)
- [x] **Live-API E2E** (isolated data, cleaned up): non-manager sees 0 approvals vs manager sees all; board document create/list/download/update roundtrip passes
- [x] Verified areas with real business logic: attendance same-row check-in/out + geofence, treasury balance-add atomicity, purchase receive→inventory + cancellation reversals + mandatory invoice, miscellaneous `nameNorm` dedupe

### Hardening Round 4 — RBAC notification delivery (complete)
- [x] **Role/permission-targeted notifications**: `Notification` model gains `targetRoles String[]` + `targetPermissions String[]`; migration `20260814093322_add_notification_role_permission_targets`
- [x] **Domain visibility rule**: `isVisibleTo(roles, permissions)` — personal → self only; targeted → role **or** permission match; untargeted broadcast → everyone; admins bypass scoping
- [x] **Read-time scoping from JWT**: `findAll` / `markAllAsRead` / `clearAll` build an RBAC OR-clause from the authenticated user's `roleNames` + `permissions` (no extra DB round-trips); mark-read / delete enforce `isVisibleTo` for non-admins
- [x] **Fan-out targets**: shared `NotificationService.persist()` records `targetRoles`/`targetPermissions`; `createForRoles` and `createForPermissionHolders` stamp delivery scopes on generated rows
- [x] **API**: `POST /notifications` accepts validated `targetRoles`/`targetPermissions` arrays (role max 50, permission max 200, string each)
- [x] **Unit tests + live E2E**: 20 new unit tests (entity visibility matrix, list use-case forwarding, repository OR-clause shape incl. empty-branch trimming + admin bypass); live-API E2E 6/6 — role-targeted broadcast reached only the role member, permission-targeted reached only the permission holder, untargeted reached all, admin saw everything, mark-all-read scoped to the user's own set (isolated data purged)

## Verification Commands

```bash
cd backend
npx tsc --noEmit                    # typecheck
npx vitest run                      # unit tests (126/126)
npx ts-node prisma/eval-ai-arabic.ts # live AI-agent eval (323/323) — needs running backend
npm run lint                        # ESLint (0 errors)

cd ../frontend
npx tsc --noEmit                    # typecheck
```
