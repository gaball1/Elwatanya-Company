# El Wataniya Construction ERP

Production-grade ERP system for construction companies.

## Workspace Structure

```
├── frontend/     # Next.js application (source of truth during migration)
├── backend/      # NestJS + Prisma + PostgreSQL API
├── docs/         # Architecture and migration documentation
└── docker-compose.yml
```

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop

### Setup

```bash
# Clone and install
npm install

# Start PostgreSQL
npm run docker:up

# Configure environment
cp .env.example .env
cp backend/.env.example backend/.env

# Initialize database
npm run db:migrate --workspace=backend
npm run prisma:seed --workspace=backend

# Development
npm run dev:frontend   # http://localhost:3000
npm run dev:backend    # http://localhost:3001
```

### API Documentation
Swagger UI: http://localhost:3001/api/docs

## Migration Status

| Phase | Status |
|-------|--------|
| Workspace structure | ✅ Complete |
| Backend foundation | ✅ Complete |
| Frontend analysis | ✅ Complete |
| Migration plan | ✅ Complete |
| Business modules | ⏸ Awaiting approval |

See [docs/BACKEND_MIGRATION_PLAN.md](docs/BACKEND_MIGRATION_PLAN.md) for the full migration plan.

## Technology Stack

### Frontend (`frontend/`)
- Next.js 16, React 19, TypeScript, Tailwind CSS, next-intl

### Backend (`backend/`)
- NestJS 11, Prisma 6, PostgreSQL 16, JWT, Swagger

## Default Admin (seed)
- Email: `admin@elwataniya.com`
- Password: `Admin@123`
