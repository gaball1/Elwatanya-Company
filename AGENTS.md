# Construction ERP - AI Development Guide

## Project Overview

This project is a production-grade ERP system for construction companies.

The system is designed to manage the complete lifecycle of construction projects, including project management, buildings, bills of quantities (BOQs), subcontractors, contractor estimates, client statements, extracts, treasury operations, inventory, employees, suppliers, attendance, and financial reporting.

This is not a demo project or prototype. Every implementation should be production-ready, scalable, maintainable, and suitable for real construction companies.

---

## Workspace Structure

```
elwataniya-company/
├── frontend/          # Next.js application (source of truth during migration)
├── backend/           # NestJS + Prisma + PostgreSQL API
├── docs/              # Migration plans and architecture docs
└── docker-compose.yml # PostgreSQL container
```

---

## Current Technology Stack

### Frontend (`frontend/`)

- Next.js (App Router)
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- next-intl (Arabic / English)

### Backend (`backend/`)

- NestJS 11
- Prisma 6
- PostgreSQL 16
- JWT Authentication
- RBAC (Role-Based Access Control)
- Swagger/OpenAPI
- Docker

### State Management (Frontend)

- React Context
- Custom Hooks

---

## Migration Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Workspace structure | ✅ Complete |
| 2 | Frontend analysis | ✅ Complete |
| 3 | Migration plan | ✅ Complete |
| 4 | Backend foundation | ✅ Complete |
| 5+ | Business modules | ⏸ Awaiting approval |

See `docs/BACKEND_MIGRATION_PLAN.md` for the full plan.

---

## Project Philosophy

Every implementation must:

- Reuse existing code.
- Preserve business rules.
- Avoid code duplication.
- Follow existing architecture.
- Keep components reusable.
- Keep business logic centralized.
- Prefer extension over replacement.

Never rewrite working implementations without a clear reason.

Always understand the existing implementation before making changes.

The frontend remains the source of truth during migration. Do not modify frontend behavior unless explicitly requested.

---

## Development Commands

```bash
npm run dev:frontend    # Start Next.js (port 3000)
npm run dev:backend     # Start NestJS (port 3001)
npm run docker:up       # Start PostgreSQL
npm run db:migrate      # Run Prisma migrations
```

Swagger docs: http://localhost:3001/api/docs
