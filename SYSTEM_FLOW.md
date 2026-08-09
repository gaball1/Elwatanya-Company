# SYSTEM_FLOW.md — El Wataniya Construction ERP

## User Flow

### 1. Authentication & Security
```
Login → JWT access token (15min) + Refresh token (7d, rotation)
│
├── Forgot Password → Email → Reset token (1hr) → New password
├── Change Password → Validates current → Revokes all refresh tokens
└── Logout → Revokes refresh token (family invalidation on reuse detection)
```

### 2. Authorization (RBAC)
```
User → RoleAssignment → Role → RolePermission → Permission
                                                    │
JWT payload includes permissions array ──────────────┘
                                                    │
Global PermissionGuard checks @RequirePermission()  │
                                                    │
Frontend: usePermissions() hook + <Can> component ──┘
```

### 3. API Response Standard
```
Success:       { success: true,  data: {...} }
Validation:    { success: false, code: "VALIDATION_ERROR", message: "...", errors: [...] }
Forbidden:     { success: false, code: "FORBIDDEN",        message: "..." }
Not Found:     { success: false, code: "NOT_FOUND",        message: "..." }
Conflict:      { success: false, code: "CONFLICT",         message: "..." }
Internal:      { success: false, code: "INTERNAL_ERROR",   message: "..." }
```

### 4. Audit System
```
Every CREATE/UPDATE/DELETE (via AuditInterceptor)
Every LOGIN/LOGOUT/PASSWORD_CHANGE
     │
     ▼
AuditLog: userId, action, entity, entityId, ip, timestamp
     │
     ▼
GET /api/v1/audit?entity=X&action=Y&skip=0&take=50
GET /api/v1/audit/entity?entity=project&entityId=123  ← Activity Timeline
```

### 5. Soft Delete & Recycle Bin
```
DELETE /api/v1/:entity/:id  → sets deletedAt (soft delete)
GET    /api/v1/recycle-bin  → lists all deleted items
POST   /api/v1/recycle-bin/:entity/:id/restore → removes deletedAt
DELETE /api/v1/recycle-bin/:entity/:id         → permanent delete
```

### 6. Project Management
```
Projects List → Create/Edit/Delete Project → Select Project → Buildings List
```

**Project Fields:** code, name, location, description, client, startDate, status (active/completed/on_hold), progress (0-100)

### 3. Building Management
```
Buildings List → Create/Edit/Delete Building → Select Building → Estimates/Subcontractors/Statements
```

**Building Fields:** name, code, type (سكني/إداري/تجاري/خدمي), startDate, description, status (active/completed/on_hold)

### 4. BOQ Pipeline
```
Employer BOQ (import from Excel) → Analytical BOQ (company prices) → Final BOQ (analyze into components) → Distribute to Contractors
```

**Step-by-step:**
1. **Employer BOQ** — Import client's bill of quantities (itemCode, description, unit, quantity, unitPrice)
2. **Analytical BOQ** — Company's internal pricing (import from employer or manual)
3. **Final BOQ** — Sync from analytical → analyze items into components (نوع工作分解)
4. **Distribution** — Allocate components to contractors (subcontractors)

### 5. Contractor BOQ Management
```
Select Building → Select Subcontractor → Allocate Components → Contractor BOQ
```

**Flow:**
1. Building subcontractors assigned with workType and agreedPrice
2. Components distributed from Final BOQ to contractor
3. Contractor BOQ tracks assigned quantities and totals

### 6. Extracts & Payments
```
Contractor BOQ → Create Extract (running/final) → Calculate → Payment
```

**Extract Flow:**
1. Select contractor → View BOQ items
2. Enter current quantities per item
3. System calculates: previous + current = total, execution %, work value
4. Apply deductions (insurance, retention, taxes, advances, penalties)
5. Net payable = totalWorkValue - deductions - previousPaid
6. Payment recorded against extract

### 7. Statements (planned)
```
Subcontractor Statement → aggregates extracts per subcontractor
Client Statement → aggregates work per client
```

### 8. HR Management (Sprint 2)
```
Departments → Roles → Employees
```
- **Roles** — Define employee roles (CEO, Technical Office, Site Engineer, etc.) with permission arrays
- **Departments** — Organization units with code, name, description, optional manager
- **Employees** — HR records with code, fullName, nationalId, phone, email, address, birthDate, hireDate, department, role, salary, status, notes
- Employee has `belongsTo` relations to Department and EmployeeRole

### 9. Attendance & Leave Management (Sprint 3)
```
Daily Attendance → Leaves → Holidays
```
- **Attendance** — Daily check-in/out tracking per employee. Status: present, absent, late, holiday. Hours worked calculated automatically.
- **Leave** — Employee leave requests. Types: annual, sick, emergency, unpaid. Status workflow: pending → approved/rejected.
- **Holiday** — Company holidays calendar with recurring yearly option.

### 10. Other Modules (planned)
- **Clients** — Client registry with contact info ✅ (Sprint 1)
- **Suppliers** — Supplier registry with products and payment terms ✅ (Sprint 1)
- **Inventory** — Stock management with min quantity alerts
- **Treasury** — Project fund tracking (initial balance, transactions)
- **Miscellaneous** — Small expenses (food, transport, tools)
- **Boards** — Daily photo boards per building
- **Notifications** — System notifications (info/warning/error)

## Data Flow Diagram

```
Employer BOQ → Analytical BOQ → Final BOQ → Component Analysis
                                                    ↓
                                              Distribution
                                                    ↓
                                         Contractor BOQ (per subcontractor)
                                                    ↓
                                    Extract (running/final) → Payment
                                                    ↓
                                         Client Statement / Subcontractor Statement
```

## Key Business Rules

1. **BOQ Hierarchy:** Employer → Analytical → Final → Component → Contractor Allocation
2. **Quantity Validation:** Cannot allocate more than remaining quantity
3. **Extract Validation:** Cumulative quantities must not exceed contract quantities
4. **Financial Integrity:** All amounts stored as Decimal(12,2), no floating point
5. **Soft Delete:** All entities support soft delete (deletedAt)
6. **Versioning:** BOQ items support versioning for audit trail
