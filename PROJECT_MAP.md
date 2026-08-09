# PROJECT_MAP.md — El Wataniya Construction ERP

## Workspace Structure

```
elwataniya-company/
├── frontend/              # Next.js App Router + next-intl
│   │   ├── (auth)/        # Login, Forgot/Reset Password
│   │   └── (dashboard)/    # All business modules
│   ├── components/error/   # ErrorBoundary, ErrorPages (Unauthorized, Forbidden, NotFound, ServerError)
│   ├── components/Can.tsx  # Permission-aware component (conditional render)
│   ├── hooks/
│   │   ├── usePermissions.ts # usePermission, useHasPermission, useHasAllPermissions, useHasAnyPermission
│   │   └── useUser.ts        # User state with localStorage persistence
│   ├── services/           # API service modules
│   ├── lib/
│   │   └── api/apiClient.ts # Standardized ApiResponse unwrapper
├── backend/              # NestJS + Prisma + PostgreSQL
│   ├── src/
│   │   ├── auth/          # JWT auth (login, register, refresh, logout, forgot/reset/change password)
│   │   ├── common/
│   │   │   ├── decorators/ # @Public(), @RequirePermission(), @CurrentUser()
│   │   │   ├── filters/    # GlobalExceptionFilter (standardized ApiResponse errors)
│   │   │   ├── guards/     # JwtAuthGuard, PermissionGuard (global RBAC)
│   │   │   ├── interceptors/ # TransformInterceptor, LoggingInterceptor, AuditInterceptor
│   │   │   ├── middleware/   # CorrelationIdMiddleware
│   │   │   ├── response/     # ApiResponse utility class
│   │   │   └── utils/        # Pagination helper
│   │   ├── modules/
│   │   │   ├── audit/         # Audit log module
│   │   │   ├── recycle-bin/   # Soft-delete restore/permanent-delete
│   │   │   ├── project/       # 30+ business modules
│   │       ├── projects/[id]/         # Project detail → buildings redirect
│   │       │   ├── (tabs)/buildings/  # Building list + CRUD
│   │       │   └── buildings/[buildingId]/
│   │       │       ├── estimates/     # BOQ pages (client/company/final)
│   │       │       ├── subcontractors/
│   │       │       │   └── [subcontractorId]/
│   │       │       │       ├── estimate/
│   │       │       │       ├── extracts/
│   │       │       │       └── payments/
│   │       │       ├── statements/
│   │       │       ├── client-statements/
│   │       │       └── boards/
│   │       ├── clients/
│   │       ├── suppliers/
│   │       ├── employees/
│   │       ├── inventory/
│   │       ├── treasury/
│   │       └── notifications/
│   ├── components/ui/     # Card, Button, Toast, etc.
│   ├── lib/
│   │   ├── api/           # apiClient, env
│   │   ├── mockData.ts    # Functional specification (mock data = spec)
│   │   └── boqStore.ts    # Client-side BOQ store (signatures only)
│   ├── services/          # API service layer
│   │   ├── project.service.ts
│   │   ├── building.service.ts
│   │   ├── employerBoq.service.ts
│   │   ├── analyticalBoq.service.ts
│   │   ├── finalBoq.service.ts
│   │   ├── contractorBoq.service.ts
│   │   ├── distribution.service.ts
│   │   ├── subcontractor.service.ts
│   │   ├── client.service.ts
│   │   ├── supplier.service.ts
│   │   ├── role.service.ts
│   │   ├── department.service.ts
│   │   ├── employee.service.ts
│   │   ├── attendance.service.ts
│   │   ├── leave.service.ts
│   │   ├── holiday.service.ts
│   │   ├── warehouse.service.ts
│   │   ├── category.service.ts
│   │   ├── inventory-item.service.ts
│   │   └── stock-movement.service.ts
│   └── types/
│       └── boq.ts         # BOQ type definitions
│
├── backend/               # NestJS 11 + Prisma 6
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── modules/
│       │   ├── project/          # ✅ Extended (location, description, client, startDate, status, progress)
│       │   ├── building/         # ✅ Extended (code, type, startDate, description, status)
│       │   ├── subcontractor/    # ✅ Extended (full CRUD + all fields)
│       │   ├── employer-boq/     # ✅ Complete
│       │   ├── analytical-boq/   # ✅ Complete
│       │   ├── final-boq/        # ✅ Complete
│       │   ├── contractor-boq/   # ✅ Complete
│       │   ├── distribution/     # ✅ Complete
│       │   ├── extract/          # ✅ Exists
│       │   ├── payment/          # ✅ Exists
│       │   ├── identity/         # ✅ Auth
│       │   ├── rbac/             # ✅ Roles/Permissions
│       │   ├── client/           # ✅ Sprint 1 - Full CRUD
│       │   ├── supplier/         # ✅ Sprint 1 - Full CRUD
│       │   ├── role/             # ✅ Sprint 2 - EmployeeRole CRUD
│       │   ├── department/       # ✅ Sprint 2 - Full CRUD
│       │   ├── employee/         # ✅ Sprint 2 - Full CRUD
│       │   ├── attendance/       # ✅ Sprint 3 - Full CRUD
│       │   ├── leave/            # ✅ Sprint 3 - Full CRUD
│       │   ├── holiday/          # ✅ Sprint 3 - Full CRUD
│       │   ├── warehouse/        # ✅ Sprint 4 - Full CRUD
│       │   ├── category/         # ✅ Sprint 4 - Full CRUD
│       │   ├── inventory-item/   # ✅ Sprint 4 - Full CRUD
│       │   └── stock-movement/   # ✅ Sprint 4 - Full CRUD
│       ├── auth/
│       ├── users/
│       ├── prisma/
│       ├── health/
│       └── common/
│
├── docs/
│   └── BACKEND_MIGRATION_PLAN.md
├── PROJECT_PLAN.md
├── PROJECT_MAP.md
├── SYSTEM_FLOW.md
└── docker-compose.yml
```

## API Endpoints

### Projects
| Method | Path | Status |
|--------|------|--------|
| POST | /api/v1/projects | ✅ Full fields |
| GET | /api/v1/projects | ✅ Full fields |
| GET | /api/v1/projects/:id | ✅ Full fields |
| PATCH | /api/v1/projects/:id | ✅ Full fields |
| DELETE | /api/v1/projects/:id | ✅ |

### Buildings
| Method | Path | Status |
|--------|------|--------|
| POST | /api/v1/projects/:projectId/buildings | ✅ Full fields |
| GET | /api/v1/projects/:projectId/buildings | ✅ Full fields |
| GET | /api/v1/buildings/:id | ✅ Full fields |
| PATCH | /api/v1/buildings/:id | ✅ Full fields |
| DELETE | /api/v1/buildings/:id | ✅ |

### Subcontractors
| Method | Path | Status |
|--------|------|--------|
| POST | /api/v1/subcontractors | ✅ Full fields |
| GET | /api/v1/subcontractors | ✅ Full fields |
| GET | /api/v1/subcontractors/:id | ✅ Full fields |
| PATCH | /api/v1/subcontractors/:id | ✅ Full fields |
| DELETE | /api/v1/subcontractors/:id | ✅ |

### BOQ Pipeline
| Method | Path | Status |
|--------|------|--------|
| GET/POST/PUT | /api/v1/buildings/:buildingId/boq/employer | ✅ |
| GET/PUT/PATCH/DELETE/POST | /api/v1/buildings/:buildingId/boq/analytical | ✅ |
| GET/POST/PATCH/DELETE + analyze/components | /api/v1/buildings/:buildingId/boq/final | ✅ |
| GET/PATCH/DELETE/POST | /api/v1/buildings/:buildingId/contractors/:contractorId/boq | ✅ |
| POST | /api/v1/buildings/:buildingId/distribute | ✅ |

### Clients & Suppliers
| Method | Path | Status |
|--------|------|--------|
| POST | /api/v1/clients | ✅ |
| GET | /api/v1/clients | ✅ |
| GET | /api/v1/clients/:id | ✅ |
| PATCH | /api/v1/clients/:id | ✅ |
| DELETE | /api/v1/clients/:id | ✅ |
| POST | /api/v1/suppliers | ✅ |
| GET | /api/v1/suppliers | ✅ |
| GET | /api/v1/suppliers/:id | ✅ |
| PATCH | /api/v1/suppliers/:id | ✅ |
| DELETE | /api/v1/suppliers/:id | ✅ |

### Roles (EmployeeRole)
| Method | Path | Status |
|--------|------|--------|
| POST | /api/v1/roles | ✅ |
| GET | /api/v1/roles | ✅ |
| GET | /api/v1/roles/:id | ✅ |
| PATCH | /api/v1/roles/:id | ✅ |
| DELETE | /api/v1/roles/:id | ✅ |

### Departments
| Method | Path | Status |
|--------|------|--------|
| POST | /api/v1/departments | ✅ |
| GET | /api/v1/departments | ✅ |
| GET | /api/v1/departments/:id | ✅ |
| PATCH | /api/v1/departments/:id | ✅ |
| DELETE | /api/v1/departments/:id | ✅ |

### Employees
| Method | Path | Status |
|--------|------|--------|
| POST | /api/v1/employees | ✅ |
| GET | /api/v1/employees | ✅ |
| GET | /api/v1/employees/:id | ✅ |
| PATCH | /api/v1/employees/:id | ✅ |
| DELETE | /api/v1/employees/:id | ✅ |

### Attendance
| Method | Path | Status |
|--------|------|--------|
| POST | /api/v1/attendance | ✅ |
| GET | /api/v1/attendance | ✅ |
| GET | /api/v1/attendance/:id | ✅ |
| PATCH | /api/v1/attendance/:id | ✅ |
| DELETE | /api/v1/attendance/:id | ✅ |

### Leaves
| Method | Path | Status |
|--------|------|--------|
| POST | /api/v1/leaves | ✅ |
| GET | /api/v1/leaves | ✅ |
| GET | /api/v1/leaves/:id | ✅ |
| PATCH | /api/v1/leaves/:id | ✅ |
| DELETE | /api/v1/leaves/:id | ✅ |

### Holidays
| Method | Path | Status |
|--------|------|--------|
| POST | /api/v1/holidays | ✅ |
| GET | /api/v1/holidays | ✅ |
| GET | /api/v1/holidays/:id | ✅ |
| PATCH | /api/v1/holidays/:id | ✅ |
| DELETE | /api/v1/holidays/:id | ✅ |

### Not Yet Created
- Client Statements CRUD
- Inventory/Warehouse CRUD
- Treasury/Fund CRUD
- Miscellaneous CRUD
- Notifications CRUD
- Boards CRUD

## Database Migrations
| Migration | Description |
|-----------|-------------|
| 20260726105125_extend_project_fields | Added location, description, client, startDate, status, progress to Project |
| 20260726105842_extend_building_fields | Added code, type, startDate, description, status to Building |
| 20260726110742_extend_subcontractor_fields | Added workType, marginType, marginValue, phone, email, address, joinDate, status to Subcontractor |
| 20260726114110_add_employee_department_role | Added EmployeeRole, Department, Employee models with relations |
| 20260726115521_add_attendance_leave_holiday | Added Attendance, Leave, Holiday models with relations to Employee |
| 20260726120147_add_inventory_warehouse | Added Warehouse, Category, InventoryItem, StockMovement models |
