# PROJECT_MAP.md — El Wataniya Construction ERP

## Workspace Structure

```
elwataniya-company/
├── frontend/              # Next.js App Router + next-intl
│   ├── app/[locale]/
│   │   ├── (auth)/        # Login, Forgot/Reset Password
│   │   └── (dashboard)/   # All business modules (see below)
│   ├── components/
│   │   ├── ai-agent/      # AiAgentChat
│   │   ├── analytics/     # charts.tsx
│   │   ├── boq/           # BOQ tables (e.g. ExtractDeductionsTable)
│   │   ├── error/         # ErrorBoundary, ErrorPages (Unauthorized, Forbidden, NotFound, ServerError)
│   │   ├── layout/        # Sidebar
│   │   ├── projects/      # ProjectCard, ProjectForm
│   │   ├── sections/      # Landing sections (Contact, Services, Stats)
│   │   ├── shared/        # LanguageSwitcher, PrintPdfButton
│   │   ├── signature/     # SignaturePad
│   │   ├── ui/            # Card, Button, Toast, Badge, Dialog, Input, Select, Pagination, ...
│   │   └── Can.tsx        # Permission-aware component (conditional render)
│   ├── contexts/AuthContext.tsx
│   ├── hooks/             # usePermissions, useUser, useProjects, useNotifications, useExtractFinance
│   ├── lib/
│   │   ├── api/           # apiClient (ApiResponse unwrapper), financeApi
│   │   ├── mockData.ts    # Functional specification (mock data = spec)
│   │   └── boqStore.ts    # Client-side BOQ store (signatures only)
│   ├── server/middleware/apiSecurity.ts
│   ├── services/          # 45 API service modules (see below)
│   └── types/             # boq.ts, user.ts
│
├── backend/               # NestJS 11 + Prisma 6 + PostgreSQL 16
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/    # 40+ migrations (see Migration list)
│   │   ├── seed.ts, seed-real-data.ts
│   │   └── eval-ai-arabic.ts  # AI-agent Arabic eval suite
│   ├── src/
│   │   ├── auth/          # JWT auth (login, register, refresh, logout, forgot/reset/change password)
│   │   ├── users/
│   │   ├── prisma/
│   │   ├── health/
│   │   ├── common/
│   │   │   ├── decorators/ # @Public(), @RequirePermission(), @CurrentUser()
│   │   │   ├── filters/    # GlobalExceptionFilter (standardized ApiResponse errors)
│   │   │   ├── guards/     # JwtAuthGuard, PermissionGuard, SelfAttendanceGuard
│   │   │   ├── interceptors/ # TransformInterceptor, LoggingInterceptor, AuditInterceptor
│   │   │   ├── middleware/   # CorrelationIdMiddleware
│   │   │   ├── response/     # ApiResponse utility class
│   │   │   └── utils/        # Pagination helper, is-admin, mime
│   │   └── modules/       # 60+ business modules (see below)
│   ├── eslint.config.mjs  # ESLint 9 flat config
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── docs/
│   ├── BACKEND_MIGRATION_PLAN.md
│   └── AI_AGENT_AUDIT.md
├── PROJECT_PLAN.md
├── PROJECT_MAP.md
├── SYSTEM_FLOW.md
└── docker-compose.yml
```

## Frontend Dashboard Pages

```
(dashboard)/
├── admin/
│   ├── ai-agent/          # AI assistant UI
│   ├── document-numbers/
│   ├── settings/
│   ├── signatures/
│   ├── templates/
│   └── users/
├── analytics/
├── approvals/
├── attendance/            # + history/, overrides/
├── bi-dashboard/
├── categories/
├── client-statements/     # + [statementId]/, new/
├── clients/
├── departments/
├── employees/
├── executive-dashboard/
├── holidays/
├── inventory/
├── miscellaneous/
├── notifications/
├── pending-signatures/
├── profile/
├── project-boards/
├── projects/
│   ├── [id]/
│   │   ├── (tabs)/        # analytics, buildings, inventory, miscellaneous, purchases, treasury
│   │   └── buildings/[buildingId]/
│   │       ├── boards/
│   │       ├── client-statements/
│   │       ├── estimates/ # client, company, final (each + [estimateId])
│   │       ├── statements/
│   │       └── subcontractors/[subcontractorId]/
│   │           ├── estimate/
│   │           ├── extracts/       # + new/, [extractId]/, [extractId]/edit
│   │           └── payments/
├── reports/
├── roles/
├── statements/            # + [id]/edit, new/
├── stock-movements/
├── subcontractors/
├── suppliers/
├── treasury/
└── warehouses/
```

## Frontend Services (`frontend/services/`)

```
ai-agent, analytics, bi, reports, pdf, document-engine, document-number,
signature-workflow, approval, notification, company, profile, user,
project, building, building-subcontractor, subcontractor, client, supplier,
employerBoq, analyticalBoq, finalBoq, contractorBoq, distribution,
extract, payment, attendance, shift, leave, holiday, department, role,
employee, warehouse, category, inventory-item, stock-movement,
client-statement, subcontractor-statement, project-fund, fund-transaction,
miscellaneous, purchase
```

## Backend Modules (`backend/src/modules/`)

```
BOQ pipeline:     employer-boq, analytical-boq, final-boq, contractor-boq, distribution
Buildings:        building, building-subcontractor
Procurement:      extract, payment, purchase, supplier
Financial:        project-fund, fund-transaction, miscellaneous, client-statement, subcontractor-statement
HR:               employee, department, role, attendance, attendance-override, leave, holiday, shift
Inventory:        warehouse, category, inventory-item, stock-movement
Identity/RBAC:    identity, rbac, permissions, admin-users, users, profile
Governance:       audit, recycle-bin, approval, notification, notification-engine, timeline
Enterprise:       company, white-label, document-engine, document-number, pdf-engine,
                  signature-workflow, reporting-engine, import-export, file,
                  search-engine, settings, setup-wizard
Analytics:        construction-analytics, construction-bi, monitor, scheduler, queue, domain-events
AI:               ai-agent (llm/, planner/, tools/, workflows/, nl/, evaluation/, knowledge/)
```

## API Endpoints

All business modules expose REST CRUD under `/api/v1`:

- `POST/GET /api/v1/projects`, `GET/PATCH/DELETE /api/v1/projects/:id`
- `POST/GET /api/v1/projects/:projectId/buildings`, `GET/PATCH/DELETE /api/v1/buildings/:id`
- `GET/POST/PUT /api/v1/buildings/:buildingId/boq/employer`
- `GET/PUT/PATCH/DELETE /api/v1/buildings/:buildingId/boq/analytical`
- `GET/POST/PATCH/DELETE + analyze/components /api/v1/buildings/:buildingId/boq/final`
- `GET/PATCH/DELETE/POST /api/v1/buildings/:buildingId/contractors/:contractorId/boq`
- `POST /api/v1/buildings/:buildingId/distribute`
- `POST/GET /api/v1/clients|suppliers|subcontractors|roles|departments|employees`, `GET/PATCH/DELETE /api/v1/.../:id`
- `POST/GET /api/v1/attendance|leaves|holidays|warehouses|categories|inventory-items|stock-movements`, `GET/PATCH/DELETE /api/v1/.../:id`
- `POST/GET /api/v1/project-funds|fund-transactions|miscellaneous|notifications|project-boards`, `GET/PATCH/DELETE /api/v1/.../:id`
- `POST/GET /api/v1/client-statements|subcontractor-statements`, `GET/PATCH/DELETE /api/v1/.../:id`
- `POST/GET /api/v1/purchases|approvals|shifts`, `GET/PATCH/DELETE /api/v1/.../:id`
- `POST/GET /api/v1/company`, `GET/PATCH /api/v1/document-numbers`, `POST /api/v1/pdf/render`
- `GET /api/v1/audit`, `GET /api/v1/audit/entity`, `GET /api/v1/recycle-bin`, `POST/DELETE /api/v1/recycle-bin/:entity/:id`
- `POST /api/v1/ai-agent/chat`, conversations/topics/analytics under `/api/v1/ai-agent`
- Auth: `POST /api/v1/auth/login|refresh|logout|register|forgot-password|reset-password|change-password`

## Database Migrations (key)

| Migration | Description |
|-----------|-------------|
| 20260713092651_initial | Initial schema |
| 20260726105125_extend_project_fields | Project: location, description, client, startDate, status, progress |
| 20260726105842_extend_building_fields | Building: code, type, startDate, description, status |
| 20260726110742_extend_subcontractor_fields | Subcontractor: workType, marginType, marginValue, phone, email, address, joinDate, status |
| 20260726114110_add_employee_department_role | EmployeeRole, Department, Employee models |
| 20260726115521_add_attendance_leave_holiday | Attendance, Leave, Holiday models |
| 20260726120147_add_inventory_warehouse | Warehouse, Category, InventoryItem, StockMovement |
| 20260726121433_add_treasury_funds | ProjectFund, FundTransaction, Miscellaneous |
| 20260726122021_add_notification_project_board | Notification, ProjectBoard |
| 20260726122627_add_statements | ClientStatement, SubcontractorStatement |
| 20260726124122_add_password_reset_auth_improvements | Password reset/change auth |
| 20260726124242_add_audit_log | AuditLog |
| 20260728101200_add_boq_code_counter | BOQ code counter |
| 20260728110000_add_purchases_module | Purchases |
| 20260729100000_add_user_employeeId | User ↔ Employee |
| 20260729100754_add_user_project_assignment | User ↔ Project |
| 20260729141505_add_approval_model | Approvals |
| 20260729191401_add_attendance_gps | GPS check-in fields |
| 20260730113917_add_attendance_extended_fields | Attendance extended fields |
| 20260730115625_add_shift_geofencing_override | Shift, geofencing, overrides |
| 20260730205746_add_company_model | Company/white-label |
| 20260730210135_add_user_signature | User signature |
| 20260730210924_add_document_engine | Document engine templates |
| 20260731111316_add_verification_hash_and_company_signature | Verification hash, company signature |
| 20260801104654_add_payment_status | Payment status |
| 20260801105642_add_ai_conversations | AI agent conversations |
| 20260802101607_inventory_dedupe_purchase_stock | Inventory/purchase stock dedupe |
| 20260802114940_add_override_snapshot | Attendance override snapshots |
| 20260808174053_add_purchases_company_permissions | Purchases company scoping + permissions |
| 20260809152400_add_misc_invoice_file | Miscellaneous invoiceFile |
| 20260809170000_fix_file_mime_types | File MIME type validation |
| 20260809180000_public_company_asset_urls | Public company asset URLs |
```
