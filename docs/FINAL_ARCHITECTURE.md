# Final Architecture — El Wataniya Construction ERP

> **Status:** Architecture approved. Ready for implementation.
> **Last Updated:** 2026-07-30
>
> This document defines the complete architecture blueprint. All 13 enterprise
> requirements are integrated below. The existing DDD kernel, EventBus stub,
> 42 module scaffold, and AI agent are acknowledged and extended.

---

## Table of Contents

1. [Architecture Principles](#1-architecture-principles)
2. [High-Level System Diagram](#2-high-level-system-diagram)
3. [Module Map (All 42 Business Modules)](#3-module-map)
4. [Event-Driven Architecture & Domain Events](#4-event-driven-architecture)
5. [Background Processing & Distributed Workers](#5-background-processing)
6. [Scheduler Subsystem](#6-scheduler-subsystem)
7. [Entity Timeline](#7-entity-timeline)
8. [File Management Service](#8-file-management-service)
9. [Global Search Engine](#9-global-search-engine)
10. [Notification Engine](#10-notification-engine)
11. [Global Settings Architecture](#11-global-settings-architecture)
12. [Import / Export Engine](#12-import--export-engine)
13. [System Monitoring](#13-system-monitoring)
14. [Company Setup Wizard](#14-company-setup-wizard)
15. [AI-First Vision](#15-ai-first-vision)
16. [Complete Interface & Registry Catalog](#16-complete-interface--registry-catalog)
17. [Directory Structure (Final)](#17-directory-structure-final)

---

## 1. Architecture Principles

| Principle | Application |
|-----------|-------------|
| **Clean Architecture** | Controller → Use Case → Domain Entity → Repository (interface) → Infrastructure |
| **Domain-Driven Design** | Aggregates, Value Objects, Domain Events, Repositories per bounded context |
| **SOLID** | Single responsibility per module; open/closed via provider/plugin patterns; Liskov via interfaces; interface segregation; DI via NestJS |
| **CQRS** | Separate read models for queries (timelines, search, dashboards); write models for commands |
| **Plugin-Based** | Parsers, chunk engines, embedding providers, vector stores, notification channels, import/export handlers, search strategies |
| **Provider-Based** | Every external dependency behind `Interface ← Registry ← Config` |
| **Event-Driven** | Modules publish domain events; other modules subscribe; no direct inter-module calls |
| **White Label** | Single-tenant per deployment; Company Setup Wizard on first boot; no code changes between deployments |
| **AI-First** | Every UI operation available via AI agent; planner auto-combines ERP tools + knowledge + BI |
| **Enterprise Scalability** | Background workers, queues, read replicas, caching, horizontal scaling |
| **Future-Proof** | Provider/plugin patterns allow swapping any infrastructure dependency without touching domain |

### Existing Foundation (Acknowledged)

The following already exists and is preserved:

| Component | Location | Status |
|-----------|----------|--------|
| DDD Kernel (AggregateRoot, BaseEntity, DomainEvent, ValueObject, Result, Guard, UniqueEntityId) | `backend/src/shared/kernel/` | ✅ Complete |
| EventBus interface + NotificationEventBus stub | `backend/src/common/event-bus.interface.ts` | ✅ Complete |
| 42 business modules (DDD scaffold) | `backend/src/modules/*/` | ✅ Scaffolded |
| AI Agent module (planner, tools, chaining, memory, nl, workflows) | `backend/src/modules/ai-agent/` | ✅ Scaffolded |
| Audit service + interceptors | `backend/src/common/` | ✅ Complete |
| RBAC (roles, permissions, guards) | `backend/src/modules/rbac/`, `backend/src/common/guards/` | ✅ Complete |
| Knowledge module architecture | `docs/KNOWLEDGE_ARCHITECTURE.md` | ✅ Designed |

---

## 2. High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            Client Layer                                   │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Next.js UI  │  │ Mobile App  │  │ AI Chat UI   │  │ Third-Party    │  │
│  │ (Arabic/EN) │  │ (Future)    │  │ (Agent)      │  │ API (Future)   │  │
│  └──────┬─────┘  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
└─────────┼───────────────┼────────────────┼──────────────────┼───────────┘
          │               │                │                  │
┌─────────▼───────────────▼────────────────▼──────────────────▼───────────┐
│                         API Gateway (NestJS)                             │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        Middleware Layer                              │ │
│  │  CorrelationId │ Helmet │ Throttle │ JWT Auth │ RBAC │ Audit Log   │ │
│  └────────────────────────────────┬────────────────────────────────────┘ │
│                                   │                                      │
│  ┌────────────────────────────────▼────────────────────────────────────┐ │
│  │                     Controller Layer (thin)                         │ │
│  │  Each module: ModuleController → validates DTO → delegates to UC   │ │
│  └────────────────────────────────┬────────────────────────────────────┘ │
│                                   │                                      │
│  ┌────────────────────────────────▼────────────────────────────────────┐ │
│  │                      Application Layer                               │ │
│  │  Use Cases (orchestrate domain + infrastructure)                     │ │
│  │  CQRS: Commands → write model / Queries → read model                │ │
│  └──────┬──────────────────────────────────────────────────────────────┘ │
│         │                                                               │
│  ┌──────▼──────────────────────────────────────────────────────────────┐ │
│  │                        Domain Layer                                  │ │
│  │  Aggregates │ Value Objects │ Domain Events │ Repository Interfaces │ │
│  │  Timeline Events │ Entity State Machines                             │ │
│  └──────┬──────────────────────────────────────────────────────────────┘ │
│         │                                                               │
│  ┌──────▼──────────────────────────────────────────────────────────────┐ │
│  │                     Infrastructure Layer                             │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │ │
│  │  │ Prisma   │ │ File     │ │ Queue    │ │ Vector   │ │ Cache     │ │ │
│  │  │ Repos    │ │ Service  │ │ (Bull)   │ │ Store    │ │ (Redis)   │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘

         ▼                         ▼                         ▼
┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│   Domain Events   │  │  Background Workers   │  │   Scheduler          │
│   (EventBus)      │  │  (PDF, AI, Email,     │  │   (Cron Jobs)        │
│   ┌──────────┐   │  │   KPI, Reports, ...) │  │   ┌──────────┐      │
│   │ In-Memory │   │  │   ┌──────────────┐   │  │   │ Daily    │      │
│   │ EventBus  │   │  │   │ Bull Queue   │   │  │   │ Backup   │      │
│   └────┬─────┘   │  │   └──────┬───────┘   │  │   │ KPI      │      │
│        │          │  │          │           │  │   │ Summary  │      │
│   ┌────▼─────┐   │  │   ┌──────▼───────┐   │  │   └──────────┘      │
│   │ Handlers │   │  │   │ Worker Pools  │   │  └──────────────────────┘
│   └──────────┘   │  │   └──────────────┘   │
└──────────────────┘  └──────────────────────┘
```

### Cross-Cutting Shared Services

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Shared Infrastructure                             │
│                                                                            │
│  ┌────────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐  │
│  │ File       │ │ Search    │ │ Settings   │ │ Import/  │ │ Monitor  │  │
│  │ Management │ │ Engine    │ │ Service    │ │ Export   │ │ Dashboard│  │
│  └────────────┘ └───────────┘ └───────────┘ └──────────┘ └──────────┘  │
│                                                                            │
│  ┌────────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Notification│ │ Timeline  │ │ Setup     │ │ Scheduler│ │ EventBus │  │
│  │ Engine     │ │ Service   │ │ Wizard    │ │          │ │ (Events) │  │
│  └────────────┘ └───────────┘ └───────────┘ └──────────┘ └──────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Map

### Layer Architecture per Module

```
module/
├── module.controller.ts          # Thin controller: validate → delegate
├── module.module.ts              # NestJS module definition
├── dto/                          # API DTOs (class-validator + Swagger)
├── application/
│   ├── dto/                      # Internal application DTOs
│   ├── use-cases/                # Orchestration (one file per operation)
│   │   ├── create.use-case.ts
│   │   ├── get.use-case.ts
│   │   ├── list.use-case.ts
│   │   ├── update.use-case.ts
│   │   └── delete.use-case.ts
│   ├── queries/                  # CQRS read models (where needed)
│   ├── commands/                 # CQRS write models (where needed)
│   ├── events/                   # Event handlers (subscribers)
│   │   └── handlers/
│   └── schedulers/               # Scheduled job definitions
├── domain/
│   ├── module.entity.ts          # Aggregate root
│   ├── module.repository.ts      # Repository interface
│   ├── events/                   # Domain events
│   ├── value-objects/            # Value objects
│   └── services/                 # Domain services (complex logic)
└── infrastructure/
    ├── prisma-module.repository.ts
    ├── module-timeline.ts        # Timeline integration
    └── ...provider.ts            # External providers

Modules also publish domain events and may define scheduled jobs.
```

### All 42 Business Modules

Each module follows the structure above. The 42 existing scaffolded modules are:

| # | Module | Domain | Priority |
|---|--------|--------|----------|
| 1 | `auth` | JWT auth, refresh tokens | P0 |
| 2 | `users` | User profiles, roles | P0 |
| 3 | `project` | Project lifecycle, status, progress | P1 |
| 4 | `building` | Buildings per project | P1 |
| 5 | `subcontractor` | Subcontractor registry | P1 |
| 6 | `building-subcontractor` | Building ↔ Subcontractor assignments | P1 |
| 7 | `employer-boq` | Employer Bill of Quantities | P2 |
| 8 | `analytical-boq` | Analytical breakdown | P2 |
| 9 | `final-boq` | Final BOQ with components | P2 |
| 10 | `contractor-boq` | Contractor-allocated BOQ items | P2 |
| 11 | `distribution` | Component distribution to contractors | P2 |
| 12 | `extract` | Contractor extracts (running/final) | P2 |
| 13 | `payment` | Contractor payments | P2 |
| 14 | `treasury` | Project treasury ledger | P2 |
| 15 | `fund-transaction` | Petty cash (عهدة) transactions | P2 |
| 16 | `project-fund` | Fund balance per project | P2 |
| 17 | `purchase` | Purchase records | P3 |
| 18 | `miscellaneous` | Miscellaneous expenses | P3 |
| 19 | `client-statement` | Client financial statements | P3 |
| 20 | `subcontractor-statement` | Subcontractor statements | P3 |
| 21 | `client` | Client registry | P4 |
| 22 | `supplier` | Supplier registry | P4 |
| 23 | `employee` | Employee records | P4 |
| 24 | `attendance` | Daily attendance tracking | P4 |
| 25 | `attendance-override` | Attendance corrections | P4 |
| 26 | `leave` | Leave management | P4 |
| 27 | `holiday` | Holiday calendar | P4 |
| 28 | `shift` | Shift definitions | P4 |
| 29 | `inventory-item` | Inventory item master | P4 |
| 30 | `warehouse` | Warehouse registry | P4 |
| 31 | `category` | Item categorization | P4 |
| 32 | `stock-movement` | Stock in/out transactions | P4 |
| 33 | `notification` | System notifications | P4 |
| 34 | `project-board` | Photo boards for projects | P4 |
| 35 | `approval` | Approval workflows | P3 |
| 36 | `role` | Role definitions | P0 |
| 37 | `department` | Department hierarchy | P4 |
| 38 | `permissions` | Permission definitions | P0 |
| 39 | `profile` | User profile management | P0 |
| 40 | `admin-users` | Admin user management | P0 |
| 41 | `audit` | Audit log system | P2 |
| 42 | `recycle-bin` | Soft-delete restore | P2 |

### Shared Infrastructure Modules (New)

| # | Module | Domain | Priority |
|---|--------|--------|----------|
| 43 | `domain-events` | Event bus, handlers, event store | P0 |
| 44 | `file` | Centralized file management | P0 |
| 45 | `search-engine` | Global hybrid search | P1 |
| 46 | `settings` | Global settings groups | P0 |
| 47 | `import-export` | Centralized import/export engine | P2 |
| 48 | `scheduler` | Scheduled job definitions | P1 |
| 49 | `queue` | Bull queue management | P0 |
| 50 | `worker` | Background worker pool | P1 |
| 51 | `timeline` | Entity timeline service | P1 |
| 52 | `notification-engine` | Multi-channel delivery | P1 |
| 53 | `monitor` | System monitoring dashboard | P2 |
| 54 | `setup-wizard` | Company setup on first boot | P0 |

---

## 4. Event-Driven Architecture

### Design

Modules must not communicate directly. Instead they publish domain events,
and other modules subscribe to those events.

### Existing Foundation

The `EventBus` interface and `NotificationEventBus` stub already exist at
`backend/src/common/event-bus.interface.ts`. These are now extended.

### Extended EventBus

```typescript
// backend/src/modules/domain-events/domain/event-bus.interface.ts

interface DomainEvent {
  readonly eventName: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly payload: Record<string, any>;
  readonly occurredOn: Date;
  readonly correlationId?: string;
  readonly metadata?: Record<string, any>;
}

interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
  getEvents(aggregateId: string): Promise<DomainEvent[]>;
}

interface EventHandler {
  handle(event: DomainEvent): Promise<void>;
}
```

### Event Store

All published events are persisted in an `EventStore` table for replay,
debugging, and audit:

```
model EventStoreRecord {
  id            String   @id @default(uuid())
  eventName     String
  aggregateId   String
  aggregateType String
  payload       Json
  occurredOn    DateTime @default(now())
  correlationId String?
  metadata      Json?
  
  @@index([aggregateId])
  @@index([eventName])
  @@index([occurredOn])
}
```

### Domain Events Catalog

| Event | Publisher | Subscribers |
|-------|-----------|-------------|
| `ProjectCreated` | Project | Timeline, Notification, Search, AI Agent |
| `ProjectCompleted` | Project | Timeline, Notification, Search, AI Agent, Scheduler |
| `ProjectStatusChanged` | Project | Timeline, Notification, Search |
| `BuildingCreated` | Building | Timeline, Search |
| `SubcontractorCreated` | Subcontractor | Timeline, Notification, Search |
| `SubcontractorAssigned` | BuildingSubcontractor | Timeline, Notification |
| `BOQUploaded` | EmployerBoq | Timeline, Search, AI Agent |
| `BOQUpdated` | FinalBoq | Timeline, Search, AI Agent |
| `ComponentDistributed` | Distribution | Timeline, ContractorBoq |
| `ContractorBOQAllocated` | ContractorBoq | Timeline, Extract |
| `ExtractCreated` | Extract | Timeline, Notification, Treasury, Search |
| `ExtractApproved` | Extract | Timeline, Notification, Payment, Treasury |
| `PaymentCreated` | Payment | Timeline, Notification, Treasury, AI Agent |
| `PaymentApproved` | Payment | Timeline, Notification, Treasury |
| `FundTransactionCreated` | FundTransaction | Timeline, Notification, ProjectFund |
| `FundRequestApproved` | Approval | Timeline, FundTransaction |
| `PurchaseCreated` | Purchase | Timeline, Treasury, Search |
| `AttendanceCheckedIn` | Attendance | Timeline, Employee, Notification |
| `AttendanceCheckedOut` | Attendance | Timeline, Employee |
| `EmployeeCreated` | Employee | Timeline, Search, Notification |
| `InventoryItemCreated` | InventoryItem | Timeline, Search |
| `StockMovementCreated` | StockMovement | Timeline, InventoryItem |
| `ClientStatementCreated` | ClientStatement | Timeline, Notification |
| `SubcontractorStatementCreated` | SubcontractorStatement | Timeline, Notification |
| `ApprovalRequested` | Approval | Timeline, Notification |
| `ApprovalCompleted` | Approval | Timeline, Notification |
| `KnowledgeDocumentUploaded` | Knowledge | Timeline, Search, AI Agent |
| `KnowledgeDocumentIndexed` | Knowledge | Timeline, AI Agent |
| `SettingsChanged` | Settings | Timeline, relevant modules |
| `BackupCompleted` | Scheduler | Monitor, Notification |
| `KPISnapshotCreated` | Scheduler | Timeline, Monitor, AI Agent |

### Module Event Wiring

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────────┐
│  Extract      │──────►│   Domain Events  │◄──────│  Notification    │
│  Module       │       │   (EventBus)     │       │  Engine          │
│              │       │                  │       │                  │
│  publishes:  │       │  ┌────────────┐  │       │  subscribes to   │
│  ExtractCreated│      │  │ EventStore │  │       │  *Created,       │
│  ExtractApproved│     │  │ (persist)  │  │       │  *Approved,      │
│              │       │  └────────────┘  │       │  *Completed, etc │
└──────────────┘       └─────────────────┘       └──────────────────┘
        │                       │                          │
        │                       ▼                          ▼
        │               ┌──────────────┐          ┌──────────────────┐
        └──────────────►│  Timeline    │          │  AI Agent        │
                        │  Module      │          │  (Planner)       │
                        │              │          │                  │
                        │  records     │          │  reads events    │
                        │  event to    │          │  for context     │
                        │  entity      │          │  + reasoning     │
                        │  timeline    │          │                  │
                        └──────────────┘          └──────────────────┘
```

---

## 5. Background Processing

### Principle

Heavy operations must never execute inside HTTP requests. Everything listed
below runs as asynchronous jobs via a distributed queue.

### Queue Architecture

```
┌──────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│  HTTP     │     │   Bull Queue      │     │   Worker Pool (distributed)
│  Request  │────►│   (Redis)         │────►│                         │
│           │     │                  │     │  ┌───────────────────┐  │
│  returns  │     │  ┌────────────┐  │     │  │ Worker Process 1  │  │
│  202/jobId│     │  │ Job Queue  │  │     │  │ PDF Generation    │  │
└──────────┘     │  └────────────┘  │     │  └───────────────────┘  │
                 │                  │     │  ┌───────────────────┐  │
                 │  ┌────────────┐  │     │  │ Worker Process 2  │  │
                 │  │ Failed     │  │     │  │ AI Indexing       │  │
                 │  │ Queue      │  │     │  └───────────────────┘  │
                 │  └────────────┘  │     │  ┌───────────────────┐  │
                 │                  │     │  │ Worker Process N  │  │
                 │  ┌────────────┐  │     │  │ Email Sending     │  │
                 │  │ Delayed    │  │     │  └───────────────────┘  │
                 │  │ Queue      │  │     └─────────────────────────┘
                 │  └────────────┘  │
                 └──────────────────┘
```

### Job Catalog

| Job | Queue | Description | Priority |
|-----|-------|-------------|----------|
| `pdf:generate` | `pdf` | Generate extract PDF, report PDF | High |
| `ai:index-document` | `ai` | Parse, chunk, embed knowledge document | High |
| `ai:generate-embedding` | `ai` | Generate/update embeddings | Medium |
| `ai:ingest-knowledge` | `ai` | Full knowledge base ingestion | Low |
| `kpi:snapshot` | `kpi` | Create monthly/weekly KPI snapshots | Medium |
| `notification:deliver` | `notification` | Send in-app, email push notifications | High |
| `report:monthly` | `report` | Generate monthly financial report | Low |
| `audit:export` | `audit` | Export audit logs | Low |
| `email:send` | `email` | Send transactional emails | Medium |
| `backup:generate` | `backup` | Generate database + file backup | Low |
| `search:reindex` | `search` | Rebuild search index | Low |
| `timeline:cleanup` | `maintenance` | Archive old timeline events | Low |
| `file:cleanup-temp` | `maintenance` | Clean up temporary uploads | Low |
| `token:cleanup-expired` | `maintenance` | Remove expired refresh tokens | Low |
| `attendance:daily-summary` | `report` | Generate daily attendance summary | Medium |
| `cashflow:daily-summary` | `report` | Generate daily cash flow summary | Medium |
| `contractor:performance` | `kpi` | Update contractor performance metrics | Low |

### Queue Module Structure

```
backend/src/modules/queue/
├── queue.module.ts
├── queue.service.ts                    # Job dispatch
├── queue.config.ts                     # Redis, concurrency, retry config
├── domain/
│   ├── job.entity.ts
│   ├── job-type.enum.ts
│   └── job-repository.interface.ts
├── infrastructure/
│   ├── bull-queue.provider.ts          # BullMQ implementation
│   └── prisma-job-repository.ts        # Job tracking in DB
└── workers/                            # Worker process definitions
    ├── pdf/
    │   └── pdf-generator.worker.ts
    ├── ai/
    │   ├── index-document.worker.ts
    │   ├── generate-embedding.worker.ts
    │   └── ingest-knowledge.worker.ts
    ├── kpi/
    │   └── kpi-snapshot.worker.ts
    ├── notification/
    │   └── notification-delivery.worker.ts
    ├── report/
    │   ├── monthly-report.worker.ts
    │   ├── daily-attendance.worker.ts
    │   ├── daily-cashflow.worker.ts
    │   └── contractor-performance.worker.ts
    ├── email/
    │   └── email-sender.worker.ts
    ├── audit/
    │   └── audit-exporter.worker.ts
    ├── backup/
    │   └── backup-generator.worker.ts
    ├── search/
    │   └── search-reindex.worker.ts
    └── maintenance/
        ├── temp-file-cleanup.worker.ts
        └── expired-token-cleanup.worker.ts
```

---

## 6. Scheduler Subsystem

### Design

A centralized scheduler triggers recurring jobs. Jobs are defined per module
and registered in the scheduler registry.

```
┌─────────────────────────────────────────────────────┐
│                  Scheduler Module                     │
│                                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │            Scheduler Registry                  │  │
│  │  register(job: ScheduledJob)                   │  │
│  │  getJobs(): ScheduledJob[]                     │  │
│  └────────────────────┬──────────────────────────┘  │
│                       │                              │
│  ┌────────────────────▼──────────────────────────┐  │
│  │              Cron Provider                     │  │
│  │  @nestjs/schedule (BullMQ repeatable jobs)    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Scheduled Job Definitions

```typescript
interface ScheduledJob {
  name: string;
  cronExpression: string;
  description: string;
  execute(): Promise<void>;
  enabled?: boolean; // Can be toggled via Settings
}
```

### Job Schedule

| Job | Cron | Description |
|-----|------|-------------|
| `daily-backup` | `0 2 * * *` (2 AM) | Database + file backup |
| `monthly-kpi-snapshot` | `0 3 1 * *` (1st, 3 AM) | Monthly KPI snapshot |
| `weekly-reports` | `0 4 * * 0` (Sunday, 4 AM) | Generate weekly reports |
| `daily-attendance-summary` | `0 18 * * *` (6 PM) | Summarize daily attendance |
| `daily-cashflow-summary` | `0 19 * * *` (7 PM) | Summarize daily cash flow |
| `contractor-performance` | `0 5 * * 1` (Monday, 5 AM) | Update contractor metrics |
| `ai-reindex` | `0 3 * * 6` (Saturday, 3 AM) | Re-index knowledge base |
| `cleanup-temp-files` | `0 4 * * *` (4 AM) | Remove temp uploads |
| `cleanup-expired-tokens` | `0 5 * * *` (5 AM) | Remove expired tokens |
| `cleanup-stale-jobs` | `0 6 * * *` (6 AM) | Clean up abandoned jobs |

### Module Structure

```
backend/src/modules/scheduler/
├── scheduler.module.ts
├── scheduler.registry.ts              # Job registration
├── scheduler.service.ts               # Cron management
├── domain/
│   └── scheduled-job.interface.ts
└── jobs/                              # Job definitions
    ├── daily-backup.job.ts
    ├── monthly-kpi-snapshot.job.ts
    ├── weekly-reports.job.ts
    ├── daily-attendance-summary.job.ts
    ├── daily-cashflow-summary.job.ts
    ├── contractor-performance.job.ts
    ├── ai-reindex.job.ts
    ├── cleanup-temp-files.job.ts
    └── cleanup-expired-tokens.job.ts
```

---

## 7. Entity Timeline

### Design

Every important entity exposes a Timeline — an ordered list of events that
occurred on that entity. This is separate from Audit Logs (which track who
did what) — a Timeline describes WHAT happened to the entity.

### Example: Project Timeline

```
Project: Cairo Tower
──────────────────────────────────────────────────
📅 2026-01-15 09:00  │ Created                │ Project created by Ahmed
📅 2026-01-20 14:30  │ BOQ Imported           │ 45 BOQ items imported
📅 2026-02-01 10:00  │ Contractor Added       │ Contractor XYZ assigned
📅 2026-02-15 11:00  │ Purchase Created       │ Materials purchased (#P-001)
📅 2026-03-01 08:30  │ Extract Created        │ Extract #1 created
📅 2026-03-10 16:00  │ Extract Approved       │ Extract #1 approved
📅 2026-03-10 16:05  │ Payment Created        │ Payment of 50,000 EGP
📅 2026-03-15 09:00  │ Fund Increased         │ Fund topped up by 100,000 EGP
📅 2026-04-01 12:00  │ Status Changed         │ Active → Under Review
📅 2026-06-30 17:00  │ Completed              │ Project marked completed
```

### Database Schema

```prisma
model TimelineEvent {
  id            String   @id @default(uuid())
  entityType    String   // 'project', 'building', 'extract', etc.
  entityId      String   // UUID of the entity
  eventName     String   // Human-readable: 'Created', 'BOQ Imported', etc.
  eventCategory String   // 'lifecycle', 'finance', 'document', 'status'
  description   String?  // Optional longer description
  metadata      Json?    // Additional context (amounts, references, etc.)
  occurredAt    DateTime @default(now())
  causedByEventId String? // Link to the domain event that triggered this
  triggeredById String?  // User who triggered the event (if applicable)

  @@index([entityType, entityId, occurredAt])
  @@index([entityType, entityId])
  @@index([eventCategory])
  @@index([occurredAt])
}
```

### Timeline Service Interface

```typescript
interface TimelineService {
  record(event: TimelineEntry): Promise<void>;
  getTimeline(entityType: string, entityId: string, options?: {
    category?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<TimelineEvent[]>;
  getEntityLifecycle(entityType: string, entityId: string): Promise<{
    created: Date;
    statusChanges: { from: string; to: string; at: Date }[];
    keyEvents: TimelineEvent[];
    completedAt?: Date;
  }>;
}
```

### Module Structure

```
backend/src/modules/timeline/
├── timeline.module.ts
├── timeline.controller.ts        # GET /api/timeline/:entityType/:entityId
├── timeline.service.ts           # Record + query
├── timeline.subscriber.ts        # Listens to domain events
├── domain/
│   ├── timeline-event.entity.ts  # Aggregate root
│   ├── timeline.repository.ts
│   └── timeline-entry.interface.ts
├── infrastructure/
│   └── prisma-timeline.repository.ts
```

### Integration Points

- Modules do NOT call TimelineService directly.
- Modules publish domain events → Timeline subscriber listens → records.
- AI Agent can read timeline via `TimelineService.getTimeline()`.
- The same pattern works for all 42 entity types.

---

## 8. File Management Service

### Design

All uploaded files go through a centralized File Service. No module
implements upload logic independently.

### Supported File Types

| Type | Category | Storage Path | Max Size |
|------|----------|-------------|----------|
| Company Logo | `branding` | `/uploads/branding/logo/` | 2 MB |
| Company Stamp | `branding` | `/uploads/branding/stamp/` | 2 MB |
| Signature | `branding` | `/uploads/branding/signature/` | 1 MB |
| Attachment | `attachment` | `/uploads/attachments/` | 20 MB |
| Contract | `contract` | `/uploads/contracts/` | 50 MB |
| Drawing (DWG) | `drawing` | `/uploads/drawings/` | 100 MB |
| BOQ File (XLSX) | `boq` | `/uploads/boq/` | 20 MB |
| Purchase Invoice | `invoice` | `/uploads/invoices/` | 20 MB |
| Extract PDF | `extract-pdf` | `/uploads/extracts/` | 10 MB |
| Image | `image` | `/uploads/images/` | 10 MB |
| Knowledge Document | `knowledge` | `/uploads/knowledge/` | 100 MB |
| Signature Image | `signature` | `/uploads/signatures/` | 2 MB |

### File Service Interface

```typescript
interface FileService {
  upload(file: Buffer | ReadStream, options: UploadOptions): Promise<FileRecord>;
  uploadBase64(base64: string, options: UploadOptions): Promise<FileRecord>;
  getFile(fileId: string): Promise<FileRecord>;
  getFileStream(fileId: string): Promise<ReadStream>;
  deleteFile(fileId: string): Promise<void>;
  getFileUrl(fileId: string): string;
  listFiles(category: string, entityType?: string, entityId?: string): Promise<FileRecord[]>;
}

interface UploadOptions {
  category: FileCategory;
  fileName: string;
  mimeType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

enum FileCategory {
  BRANDING = 'branding',
  ATTACHMENT = 'attachment',
  CONTRACT = 'contract',
  DRAWING = 'drawing',
  BOQ = 'boq',
  INVOICE = 'invoice',
  EXTRACT_PDF = 'extract-pdf',
  IMAGE = 'image',
  KNOWLEDGE = 'knowledge',
  SIGNATURE = 'signature',
}

interface FileRecord {
  id: string;
  category: FileCategory;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  uploadedById?: string;
  createdAt: Date;
}
```

### File Provider Interface (Storage Abstraction)

```typescript
interface FileStorageProvider {
  readonly name: string;
  save(file: Buffer | ReadStream, path: string): Promise<string>;
  read(path: string): Promise<ReadStream>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}
```

### Providers

| Provider | Use Case |
|----------|----------|
| `LocalFileStorage` | Development, single-server |
| `S3FileStorage` | Production, distributed |
| `GCSFileStorage` | Alternative cloud |

### Module Structure

```
backend/src/modules/file/
├── file.module.ts
├── file.controller.ts              # POST/GET/DELETE /api/files
├── file.service.ts                 # Orchestration
├── domain/
│   ├── file.entity.ts
│   ├── file.repository.ts
│   ├── file.interface.ts
│   └── file-storage-provider.interface.ts
├── infrastructure/
│   ├── prisma-file.repository.ts
│   ├── storage/
│   │   ├── storage-registry.service.ts
│   │   ├── local-file-storage.provider.ts
│   │   ├── s3-file-storage.provider.ts
│   │   └── gcs-file-storage.provider.ts
│   └── image-processing.service.ts     # Resize, thumbnail, optimize
```

---

## 9. Global Search Engine

### Design

Unified search across all entities. Hybrid Search = Keyword + Metadata + Semantic.

### Searchable Entities

| Entity | Fields Indexed | Metadata Filters |
|--------|---------------|-----------------|
| Project | name, description, location, client, status | id, status, client |
| Building | name, code, description, type | id, projectId, type, status |
| BOQ (all types) | itemCode, description, unit | buildingId, boqType, projectId |
| Contractor | name, specialty, phone | id, status, workType |
| Employee | name, email, phone, department | id, departmentId, status |
| Knowledge Document | title, content, tags | projectId, buildingId, category, documentType |
| Approval | description, status, type | projectId, status, type |
| Treasury | description, amount, sourceType | projectId, dateRange |
| Purchase | name, description, supplier | projectId, dateRange |
| Inventory | name, description, category | warehouseId, categoryId |
| Audit | action, entityType, description | userId, entityType, dateRange |
| Notification | title, message, type | userId, read, type |
| Client | name, email, phone | id, status |
| Supplier | name, email, phone, specialty | id, status |

### Search Interface

```typescript
interface SearchEngine {
  search(query: SearchQuery): Promise<SearchResults>;
  index(entity: IndexableEntity): Promise<void>;
  bulkIndex(entities: IndexableEntity[]): Promise<void>;
  remove(entityType: string, entityId: string): Promise<void>;
  rebuildIndex(entityType?: string): Promise<void>;
}

interface SearchQuery {
  text: string;
  entityTypes?: string[];
  filters?: SearchFilter[];
  page?: number;
  limit?: number;
  strategy?: 'hybrid' | 'semantic' | 'keyword';
  userId?: string; // For permission-scoped results
}

interface SearchFilter {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';
  value: any;
}

interface SearchResults {
  results: SearchResultItem[];
  total: number;
  page: number;
  totalPages: number;
  queryTime: number;
}
```

### Hybrid Search Flow

```
User Query String
    │
    ├──► Query Analysis
    │       ├── Extract entity types (NER)
    │       ├── Extract metadata filters
    │       └── Detect search intent
    │
    ├──► Keyword Search (BM25/Full-text)
    │       └── Apply same filters
    │
    ├──► Semantic Search (via Knowledge module)
    │       └── Vector similarity on chunk embeddings
    │
    ├──► Metadata Filtering (applied to both)
    │
    ├──► Merge (Reciprocal Rank Fusion)
    │
    ├──► Permission Scoping (user's accessible entities)
    │
    └──► Return Unified Results with citations
```

### Module Structure

```
backend/src/modules/search-engine/
├── search-engine.module.ts
├── search-engine.controller.ts       # GET /api/search
├── search-engine.service.ts          # Orchestration
├── domain/
│   ├── search-engine.interface.ts
│   ├── indexable-entity.interface.ts
│   └── search-query.interface.ts
├── indexers/                         # Entity-specific indexers
│   ├── indexer-registry.service.ts
│   ├── project.indexer.ts
│   ├── building.indexer.ts
│   ├── subcontractor.indexer.ts
│   ├── employee.indexer.ts
│   ├── boq.indexer.ts
│   ├── extract.indexer.ts
│   ├── purchase.indexer.ts
│   ├── treasury.indexer.ts
│   ├── inventory.indexer.ts
│   ├── knowledge.indexer.ts
│   ├── approval.indexer.ts
│   ├── audit.indexer.ts
│   ├── notification.indexer.ts
│   └── client.indexer.ts
├── strategies/                       # Search strategies
│   ├── keyword-search.strategy.ts
│   ├── semantic-search.strategy.ts   # Delegates to Knowledge module
│   └── hybrid-search.strategy.ts     # RRF merge
└── infrastructure/
    └── search-index.provider.ts      # Meilisearch / Typesense / Elasticsearch
```

---

## 10. Notification Engine

### Design

Notifications become a standalone subsystem with provider abstraction.
Modules publish events → Notification Engine delivers messages.

### Provider Abstraction

```typescript
interface NotificationProvider {
  readonly name: string;
  readonly channel: NotificationChannel;
  send(notification: NotificationMessage): Promise<boolean>;
}

enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp', // Future
  PUSH = 'push',          // Future
  SMS = 'sms',            // Future
}

interface NotificationMessage {
  id: string;
  channel: NotificationChannel;
  recipientId: string;
  recipientAddress: string; // email, phone, device token
  title: string;
  body: string;
  data?: Record<string, any>; // Deep link payload
  priority?: 'low' | 'normal' | 'high';
  scheduledAt?: Date;
}

interface NotificationTemplate {
  id: string;
  channel: NotificationChannel;
  eventName: string; // Which domain event triggers this
  subjectTemplate: string; // Handlebar template
  bodyTemplate: string;
  variables: string[]; // Expected variable names
}
```

### Provider Implementations

| Provider | Channel | Library | Notes |
|----------|---------|---------|-------|
| `InAppNotificationProvider` | IN_APP | Prisma | Saves to `Notification` table |
| `EmailNotificationProvider` | EMAIL | nodemailer | SMTP / SendGrid / SES |
| `WhatsAppProvider` | WHATSAPP | (Future) | Twilio / Meta API |
| `PushNotificationProvider` | PUSH | (Future) | Firebase / Web Push |

### Flow

```
Module publishes domain event
        │
        ▼
Notification Engine subscriber catches event
        │
        ├──► Look up templates for eventName
        ├──► Determine recipients (from event payload + settings)
        ├──► Render templates with event data
        ├──► For each channel:
        │       ├──► Find active provider for channel
        │       ├──► Send via provider
        │       ├──► Log delivery result
        │       └──► Track in notification_history
        └──► Return
```

### Module Structure

```
backend/src/modules/notification-engine/
├── notification-engine.module.ts
├── notification-engine.service.ts        # Orchestration
├── notification-engine.subscriber.ts     # Domain events subscriber
├── domain/
│   ├── notification-provider.interface.ts
│   ├── notification-template.interface.ts
│   ├── notification-message.interface.ts
│   └── notification-channel.enum.ts
├── infrastructure/
│   ├── providers/
│   │   ├── provider-registry.service.ts
│   │   ├── in-app-notification.provider.ts
│   │   ├── email-notification.provider.ts
│   │   ├── whatsapp-notification.provider.ts  # Future
│   │   └── push-notification.provider.ts       # Future
│   ├── templates/
│   │   ├── notification-template.service.ts
│   │   └── template-renderer.service.ts
│   └── email/
│       ├── email.config.ts
│       └── email.service.ts
```

### Notification Templates (Example)

| Event | Channel | Subject / Title | Body |
|-------|---------|----------------|------|
| `ExtractApproved` | IN_APP | Extract Approved | "Extract #{{extractNumber}} for {{contractorName}} has been approved. Amount: {{amount}}" |
| `ExtractApproved` | EMAIL | "Extract Approved - {{projectName}}" | "Dear {{userName}}, extract #{{extractNumber}} for {{contractorName}} has been approved." |
| `PaymentCreated` | IN_APP | Payment Created | "Payment of {{amount}} to {{contractorName}} has been created." |
| `AttendanceCheckedIn` | IN_APP | Checked In | "You have checked in at {{time}}." |
| `ProjectCompleted` | IN_APP | Project Completed | "Project {{projectName}} has been marked as completed." |
| `DailyAttendanceSummary` | EMAIL | "Daily Attendance - {{date}}" | "Attendance summary for {{date}}: Present: {{present}}, Absent: {{absent}}, Late: {{late}}" |

---

## 11. Global Settings Architecture

### Design

Settings are grouped by domain. Each group is independently extensible.
Settings are stored in a single table with a type-safe accessor pattern.

### Settings Groups

| Group | Key Prefix | Examples |
|-------|-----------|---------|
| Company | `company.` | name, arabicName, englishName, logo, address, phone, email, currency |
| Branding | `branding.` | primaryColor, secondaryColor, logoUrl, stampUrl, signatureUrl |
| Finance | `finance.` | defaultInsurancePercent, maxInsurancePercent, taxRate, decimalPlaces |
| Attendance | `attendance.` | checkInTime, checkOutTime, lateThreshold, autoCheckout, overtimeRate |
| AI | `ai.` | embeddingProvider, vectorStore, llmModel, maxTokens, temperature |
| Reporting | `reporting.` | monthlyReportDay, weeklyReportDay, dateFormat, timezone |
| Notifications | `notifications.` | defaultChannels, emailEnabled, whatsappEnabled, pushEnabled |
| Security | `security.` | passwordMinLength, mfaEnabled, sessionTimeout, maxLoginAttempts |
| Email | `email.` | smtpHost, smtpPort, smtpUser, smtpPass, fromAddress, fromName |
| Workflow | `workflow.` | autoApproveThreshold, requireCEOApproval, maxPendingApprovals |
| Theme | `theme.` | direction (rtl/ltr), fontFamily, borderRadius, sidebarCollapsed |
| Backup | `backup.` | enabled, time, retentionDays, s3Bucket |

### Database Schema

```prisma
model Setting {
  id        String   @id @default(uuid())
  group     String   // 'company', 'finance', 'ai', etc.
  key       String   // Within-group key: 'name', 'defaultInsurancePercent', etc.
  value     Json     // Flexible: string, number, boolean, object
  type      String   // 'string', 'number', 'boolean', 'json'
  label     String?  // Human-readable label
  description String? // Help text
  isSecret  Boolean  @default(false) // Encrypted at rest
  isReadOnly Boolean @default(false) // System-managed, not user-editable
  
  @@unique([group, key])
  @@index([group])
}

// Also store the last modification
model SettingChangeLog {
  id         String   @id @default(uuid())
  group      String
  key        String
  oldValue   Json?
  newValue   Json?
  changedById String?
  changedAt  DateTime @default(now())
  
  @@index([group, key])
}
```

### Settings Service Interface

```typescript
interface SettingsService {
  // Read
  get<T>(group: string, key: string): Promise<T | undefined>;
  getOrThrow<T>(group: string, key: string): Promise<T>;
  getGroup<T>(group: string): Promise<Record<string, T>>;
  getAll(): Promise<Record<string, Record<string, any>>>;

  // Write
  set(group: string, key: string, value: any): Promise<void>;
  setGroup(group: string, values: Record<string, any>): Promise<void>;

  // Bulk initialization (Setup Wizard)
  initializeDefaults(): Promise<void>;
  seedFromWizard(wizardData: CompanySetupData): Promise<void>;

  // Events
  onChange(callback: (group: string, key: string, value: any) => void): void;
}
```

### Accessor Pattern (Type-Safe)

```typescript
// Settings are accessed through typed accessors, not raw strings:
class CompanySettings {
  constructor(private settings: SettingsService) {}
  
  get name(): Promise<string> { return this.settings.get('company', 'name'); }
  get arabicName(): Promise<string> { return this.settings.get('company', 'arabicName'); }
  get logo(): Promise<string> { return this.settings.get('company', 'logo'); }
  get currency(): Promise<string> { return this.settings.get('company', 'currency'); }
}

class AISettings {
  constructor(private settings: SettingsService) {}
  
  get embeddingProvider(): Promise<string> { return this.settings.get('ai', 'embeddingProvider'); }
  get vectorStore(): Promise<string> { return this.settings.get('ai', 'vectorStore'); }
  get llmModel(): Promise<string> { return this.settings.get('ai', 'llmModel'); }
}
```

### Module Structure

```
backend/src/modules/settings/
├── settings.module.ts
├── settings.controller.ts           # CRUD /api/settings
├── settings.service.ts              # Core service
├── accessors/                       # Type-safe settings accessors
│   ├── company-settings.ts
│   ├── branding-settings.ts
│   ├── finance-settings.ts
│   ├── attendance-settings.ts
│   ├── ai-settings.ts
│   ├── reporting-settings.ts
│   ├── notification-settings.ts
│   ├── security-settings.ts
│   ├── email-settings.ts
│   ├── workflow-settings.ts
│   ├── theme-settings.ts
│   └── backup-settings.ts
├── domain/
│   ├── setting.entity.ts
│   ├── setting.repository.ts
│   └── setting.interface.ts
├── infrastructure/
│   └── prisma-setting.repository.ts
```

---

## 12. Import / Export Engine

### Design

One centralized engine. Modules register import/export handlers. No
duplicated logic anywhere.

### Plugin Architecture

```
┌─────────────────────────────────────────────┐
│           ImportExportModule                 │
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │         Handler Registry              │  │
│  │  register(handler: ImportExportHandler) │  │
│  │  getHandler(entityType): handler       │  │
│  └─────────────────┬─────────────────────┘  │
│                    │                        │
│  ┌─────────────────▼─────────────────────┐  │
│  │           ImportExportService          │  │
│  │  import(file, entityType, options)     │  │
│  │  export(entityType, filter, options)   │  │
│  └─────────────────┬─────────────────────┘  │
│                    │                        │
│  ┌─────────────────▼─────────────────────┐  │
│  │         Format Providers               │  │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐  │  │
│  │  │ Excel  │ │  CSV   │ │  JSON    │  │  │
│  │  └────────┘ └────────┘ └──────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Interfaces

```typescript
interface ImportExportHandler {
  readonly entityType: string;
  readonly supportedFormats: FormatType[];
  
  // Import: parse a row → validate → save
  validate(row: Record<string, any>, index: number): ValidationError[];
  import(row: Record<string, any>): Promise<ImportResult>;
  
  // Export: query → map to rows
  exportData(filter?: Record<string, any>): Promise<Record<string, any>[]>;
  exportHeaders(): ExportColumn[];
}

interface ExportColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required?: boolean;
  width?: number;
}

enum FormatType { EXCEL = 'xlsx', CSV = 'csv', JSON = 'json' }

interface ImportResult {
  success: boolean;
  entityId?: string;
  errors?: string[];
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}
```

### Handler Template

```typescript
// A module registers its handler like this:
@Injectable()
class ProjectImportExportHandler implements ImportExportHandler {
  readonly entityType = 'project';
  readonly supportedFormats = [FormatType.EXCEL, FormatType.CSV, FormatType.JSON];

  async validate(row: Record<string, any>, index: number): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    if (!row.name) errors.push({ row: index, field: 'name', message: 'Name is required' });
    return errors;
  }

  async import(row: Record<string, any>): Promise<ImportResult> {
    // Create entity from row
    return { success: true, entityId: '...' };
  }

  async exportData(filter?: Record<string, any>): Promise<Record<string, any>[]> {
    // Query projects and return as flat objects
    return [];
  }

  exportHeaders(): ExportColumn[] {
    return [
      { key: 'name', label: 'Project Name', type: 'string', required: true },
      { key: 'location', label: 'Location', type: 'string' },
    ];
  }
}
```

### Module Structure

```
backend/src/modules/import-export/
├── import-export.module.ts
├── import-export.controller.ts       # POST/GET /api/import-export
├── import-export.service.ts          # Orchestration
├── domain/
│   ├── import-export-handler.interface.ts
│   ├── import-result.interface.ts
│   └── format-type.enum.ts
├── infrastructure/
│   ├── handler-registry.service.ts   # Registry of all handlers
│   └── formats/
│       ├── format-provider.interface.ts
│       ├── excel-format.provider.ts   # xlsx (uses exceljs or sheetjs)
│       ├── csv-format.provider.ts
│       └── json-format.provider.ts
```

---

## 13. System Monitoring

### Design

A monitoring dashboard tracks all system components in real-time.

### Monitored Components

| Component | Metric | Source |
|-----------|--------|--------|
| Database | Connection pool, query latency, active connections | Prisma metrics |
| Cache (Redis) | Hit rate, memory usage, connected clients | Redis INFO |
| Queue (Bull) | Pending, active, failed, delayed jobs | Bull queue metrics |
| AI | Request latency, token usage, success rate | AI Agent analytics |
| Embedding Provider | Embedding latency, error rate, quota usage | Embedding registry |
| Vector Store | Search latency, document count, chunk count | Vector store health |
| Background Workers | Active workers, throughput, error rate | Worker pool metrics |
| Storage (Files) | Used space, file count, upload throughput | File service metrics |
| API Health | Response time, error rate, request rate | NestJS interceptors |
| System Load | CPU, memory, disk | OS metrics (via `os` module) |
| Active Users | Concurrent sessions, requests per user | Auth module |
| Failed Jobs | Count, type, last failure, retry attempts | Bull metrics + event store |

### Monitoring Service Interface

```typescript
interface MonitoringService {
  // Health checks
  health(): Promise<SystemHealth>;
  checkComponent(component: string): Promise<ComponentHealth>;

  // Metrics
  getMetrics(): Promise<SystemMetrics>;
  getComponentMetrics(component: string): Promise<ComponentMetrics>;

  // Events
  getRecentEvents(limit?: number): Promise<SystemEvent[]>;
  getRecentErrors(limit?: number): Promise<SystemEvent[]>;

  // Historical
  getMetricHistory(metric: string, period: '1h' | '24h' | '7d' | '30d'): Promise<DataPoint[]>;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  components: Record<string, ComponentHealth>;
  uptime: number;
  lastChecked: Date;
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  message?: string;
  lastChecked: Date;
}
```

### Module Structure

```
backend/src/modules/monitor/
├── monitor.module.ts
├── monitor.controller.ts            # GET /api/monitor/health, /metrics, /events
├── monitor.service.ts               # Collect and aggregate
├── domain/
│   ├── system-health.interface.ts
│   ├── system-metrics.interface.ts
│   └── system-event.interface.ts
├── infrastructure/
│   ├── health-checkers/
│   │   ├── database-health.checker.ts
│   │   ├── redis-health.checker.ts
│   │   ├── queue-health.checker.ts
│   │   ├── ai-health.checker.ts
│   │   ├── embedding-health.checker.ts
│   │   ├── vector-store-health.checker.ts
│   │   ├── worker-health.checker.ts
│   │   ├── storage-health.checker.ts
│   │   └── system-load.checker.ts
│   └── metrics/
│       ├── metrics-collector.service.ts
│       └── metrics-store.service.ts   # In-memory ring buffer or Prometheus
```

---

## 14. Company Setup Wizard

### Design

This ERP is NOT multi-tenant. It is a White Label ERP — each deployment
belongs to exactly one company. On first startup, the Setup Wizard runs.
No code changes required when deploying to another customer.

### Detection

```typescript
// On application startup:
@Injectable()
class SetupWizardGuard implements CanActivate {
  constructor(private settingsService: SettingsService) {}

  async canActivate(): Promise<boolean> {
    const isSetup = await this.settingsService.get<boolean>('company', 'isSetup');
    if (!isSetup) {
      // Redirect all requests to /api/setup except the setup endpoints
      return false;
    }
    return true;
  }
}
```

### Wizard Steps

```
Step 1: Company Information
├── Company Name (Arabic + English)
├── Logo Upload
├── Address, Phone, Email, Website
└── Default Language (Arabic / English / Bilingual)

Step 2: Branding
├── Primary Color
├── Secondary Color
├── Logo (processed and stored via File Service)
├── Company Stamp (upload)
└── Signature Image (upload)

Step 3: Finance
├── Default Currency (EGP, USD, SAR, etc.)
├── Default Insurance Percent
├── Tax Rate
└── Decimal Places

Step 4: Administrator
├── Full Name
├── Email (used as login)
├── Password
└── Phone

Step 5: Work Schedule
├── Default Check-In Time
├── Default Check-Out Time
├── Working Days (Sat-Thu or Sun-Thu)
└── Timezone

Step 6: Confirmation
├── Summary of all settings
└── "Complete Setup" button
```

### Setup API

```typescript
@Controller('api/setup')
class SetupController {
  @Get('status')
  getStatus(): Promise<{ isSetup: boolean; currentStep?: number }>;

  @Post('company')
  saveCompanyInfo(@Body() dto: CompanyInfoDto): Promise<void>;

  @Post('branding')
  saveBranding(@Body() dto: BrandingDto): Promise<void>;

  @Post('finance')
  saveFinance(@Body() dto: FinanceDefaultsDto): Promise<void>;

  @Post('administrator')
  createAdmin(@Body() dto: CreateAdminDto): Promise<void>;

  @Post('schedule')
  saveWorkSchedule(@Body() dto: WorkScheduleDto): Promise<void>;

  @Post('complete')
  completeSetup(): Promise<{ token: string }>; // Returns JWT for admin
}
```

### Module Structure

```
backend/src/modules/setup-wizard/
├── setup-wizard.module.ts
├── setup-wizard.controller.ts       # /api/setup/*
├── setup-wizard.service.ts          # Orchestration
├── setup-wizard.guard.ts            # Blocks access until setup complete
├── domain/
│   ├── setup-state.entity.ts
│   ├── setup-state.repository.ts
│   └── setup-step.enum.ts
├── dto/
│   ├── company-info.dto.ts
│   ├── branding.dto.ts
│   ├── finance-defaults.dto.ts
│   ├── create-admin.dto.ts
│   └── work-schedule.dto.ts
└── infrastructure/
    └── prisma-setup-state.repository.ts
```

### Post-Setup Flow

```
Setup Complete
    │
    ├──► Settings initialized with company values
    ├──► Admin user created with full permissions
    ├──► Branding assets stored via File Service
    ├──► Default seed data created (departments, roles, categories)
    ├──► isSetup flag set to true
    ├──► All routes unlocked
    └──► Dashboard displayed on next login
```

---

## 15. AI-First Vision

### Design

The AI must become the primary interface to the ERP. Any operation available
in the UI should also be executable through the AI. The planner automatically
determines whether to use: ERP Tools, Knowledge Base, BI Analytics, Workflow
Engine, or a combination — without user intervention.

### Architecture

```
                          ┌─────────────────────────┐
                          │     User Query           │
                          │ "Why is Project Tower   │
                          │  losing money?"          │
                          └────────────┬────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │    Planner (AI Agent)    │
                          │                         │
                          │  Intent Classification   │
                          │  Tool Selection          │
                          │  Orchestration           │
                          └────────────┬────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
   │   ERP Tools        │  │  Knowledge Base     │  │  BI Analytics      │
   │                    │  │                    │  │                    │
   │ - getProject       │  │ - search_knowledge │  │ - getTrends       │
   │ - getExtract       │  │ - getDocument      │  │ - getKPI          │
   │ - getTreasury      │  │ - summarize_doc    │  │ - getComparison   │
   │ - getBOQ           │  │ - compare_docs     │  │ - getForecast     │
   │ - getPayment       │  │                    │  │                    │
   │ - getContractor    │  │                    │  │                    │
   │ - getTimeline      │  │                    │  │                    │
   │ - search           │  │                    │  │                    │
   └────────┬───────────┘  └────────┬───────────┘  └────────┬───────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │   Fusion Engine    │
                          │                    │
                          │ Combine results    │
                          │ Cite sources       │
                          │ Generate answer    │
                          └─────────┬──────────┘
                                    │
                          ┌─────────▼──────────┐
                          │   Unified Answer   │
                          │   with Citations   │
                          └────────────────────┘
```

### Example: "Why is Project Cairo Tower losing money?"

```
Planner.classify("Why is Project Cairo Tower losing money?")
    │
    ├── intent: COMPLEX_ANALYSIS (ERP + Knowledge + BI)
    │
    ▼
Planner.orchestrate()
    │
    ├── 1. ERP Tools:
    │       ├── getProject("Cairo Tower") → status, budget, progress
    │       ├── getTreasury("Cairo Tower") → all transactions
    │       ├── getExtracts("Cairo Tower") → extract amounts, statuses
    │       ├── getPayments("Cairo Tower") → payments made
    │       ├── getPurchases("Cairo Tower") → purchase costs
    │       ├── getBOQ("Cairo Tower") → budgeted vs actual
    │       └── getTimeline("project", "cairo-tower") → entity timeline
    │
    ├── 2. Knowledge Base:
    │       ├── search_knowledge("Cairo Tower contract terms")
    │       └── search_knowledge("Cairo Tower specifications")
    │
    ├── 3. BI Analytics:
    │       ├── getKPI("Cairo Tower", "cost-variance")
    │       ├── getKPI("Cairo Tower", "budget-utilization")
    │       ├── getTrends("Cairo Tower", "monthly-costs")
    │       └── getComparison("Cairo Tower", "similar-projects")
    │
    ├── 4. Fusion:
    │       ├── Combine all results
    │       ├── Identify root causes (e.g., overspent on materials BOQ item 02.03)
    │       ├── Cross-reference with contract penalty clauses
    │       └── Link to specific purchases exceeding budget
    │
    └── 5. Response:
            "Project Cairo Tower is losing money due to:
             1️⃣ Materials overspend (BOQ Item 02.03): 120% of budget
                → Purchase records P-045, P-046 exceeded estimate by 45%
             2️⃣ Contractor Extract #3: 85% executed but 110% of BOQ value
                → Contract Clause 7.2 (page 14) allows up to 15% variance
             3️⃣ Monthly trend shows costs increasing 8% month-over-month
                → Recommend: Review material procurement, renegotiate rates"
```

### AI Agent Tool Catalog

The AI agent exposes every business operation as a tool. The tools are
auto-discovered via the module registry.

| Tool Category | Tools |
|---------------|-------|
| **Projects** | getProject, listProjects, createProject, updateProject, getProjectTimeline |
| **Buildings** | getBuilding, listBuildings, getBuildingBOQ |
| **BOQ** | getEmployerBOQ, getAnalyticalBOQ, getFinalBOQ, getContractorBOQ |
| **Extracts** | getExtract, listExtracts, createExtract, approveExtract |
| **Payments** | getPayment, listPayments, createPayment, approvePayment |
| **Treasury** | getTreasury, getFundBalance, getFundTransactions |
| **Purchases** | getPurchase, listPurchases |
| **Contractors** | getContractor, listContractors, getContractorPerformance |
| **Employees** | getEmployee, listEmployees, getAttendance |
| **Inventory** | getInventoryItem, listInventory, checkStock |
| **Knowledge** | searchKnowledge, getDocument, summarizeDocument, compareDocuments |
| **Timeline** | getEntityTimeline, getEntityLifecycle |
| **Search** | globalSearch |
| **Settings** | getSettings, updateSettings |
| **BI/Analytics** | getKPI, getTrends, getComparison, getForecast |

### Tool Discovery

```typescript
// Tools are registered via decorator or registry:
@AITool({
  name: 'getProject',
  description: 'Get project details by ID or name',
  category: 'projects',
  parameters: {
    id: { type: 'string', description: 'Project ID' },
    name: { type: 'string', description: 'Project name (alternative)' },
  },
})
class GetProjectTool implements AITool {
  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    // ...
  }
}
```

### Existing AI Agent Module

The `backend/src/modules/ai-agent/` already exists with:

```
ai-agent/
├── ai-agent.controller.ts
├── ai-agent.module.ts
├── ai-agent.service.ts
├── analytics/
├── chaining/
├── context/
├── dto/
├── evaluation/
├── knowledge/
├── memory/
├── nl/                  # Natural language processing
├── permissions/
├── planner/             # Intent classification + orchestration
├── tools/               # Tool registry and implementations
└── workflows/           # Multi-step workflow definitions
```

This existing module is extended with:
- Full tool catalog covering all business modules
- Timeline-aware reasoning
- Knowledge fusion (already designed in `docs/KNOWLEDGE_ARCHITECTURE.md`)
- BI analytics integration
- Auto-discovery of new module tools

---

## 16. Complete Interface & Registry Catalog

### Interfaces (New)

| Interface | Module | Purpose |
|-----------|--------|---------|
| `EventBus` | DomainEvents | Publish/subscribe domain events |
| `EventHandler` | DomainEvents | Handle a specific event type |
| `EventStore` | DomainEvents | Persist and replay events |
| `FileService` | File | Upload, read, delete files |
| `FileStorageProvider` | File | Abstraction for local/S3/GCS |
| `SearchEngine` | SearchEngine | Global hybrid search |
| `IndexableEntity` | SearchEngine | Entity with indexing logic |
| `SearchStrategy` | SearchEngine | Keyword / semantic / hybrid |
| `SearchIndexer` | SearchEngine | Per-entity indexer |
| `TimelineService` | Timeline | Record and query entity timelines |
| `SettingsService` | Settings | Read/write settings by group |
| `SettingsAccessor` | Settings | Type-safe settings access |
| `NotificationProvider` | NotificationEngine | Send notification via channel |
| `NotificationTemplate` | NotificationEngine | Template definition |
| `ImportExportHandler` | ImportExport | Per-entity import/export |
| `FormatProvider` | ImportExport | Excel/CSV/JSON parsing |
| `ScheduledJob` | Scheduler | Cron job definition |
| `JobQueue` | Queue | Job dispatch |
| `Worker` | Worker | Background job processing |
| `MonitoringService` | Monitor | Health and metrics |
| `HealthChecker` | Monitor | Per-component health check |
| `AITool` | AI Agent | Tool definition for AI agent |

### Registries (New)

| Registry | Module | Purpose |
|----------|--------|---------|
| `ParserRegistry` | Knowledge (existing) | Discover parsers by file type |
| `EmbeddingRegistry` | Knowledge (existing) | Discover embedding providers |
| `VectorStoreRegistry` | Knowledge (existing) | Discover vector stores |
| `EventHandlerRegistry` | DomainEvents | Register and dispatch event handlers |
| `FileStorageRegistry` | File | Discover storage providers |
| `NotificationProviderRegistry` | NotificationEngine | Discover notification providers |
| `ImportExportHandlerRegistry` | ImportExport | Discover import/export handlers |
| `SearchIndexerRegistry` | SearchEngine | Discover per-entity indexers |
| `SchedulerRegistry` | Scheduler | Register scheduled jobs |
| `AIToolRegistry` | AI Agent (existing) | Register AI agent tools |
| `HealthCheckerRegistry` | Monitor | Register per-component checkers |
| `SettingsAccessorRegistry` | Settings | Register typed accessors |

---

## 17. Directory Structure (Final)

```
backend/
├── prisma/
│   ├── schema.prisma              # All models including new ones
│   └── migrations/
│
├── src/
│   ├── main.ts
│   ├── app.module.ts              # All modules imported
│   │
│   ├── common/                    # Cross-cutting concerns (existing)
│   │   ├── audit.service.ts
│   │   ├── base.entity.ts
│   │   ├── event-bus.interface.ts
│   │   ├── notification-event-bus.ts
│   │   ├── config/
│   │   ├── constants/
│   │   ├── decorators/
│   │   ├── exceptions/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── middleware/
│   │   ├── response/
│   │   ├── services/
│   │   └── utils/
│   │
│   ├── shared/
│   │   └── kernel/                # DDD kernel (existing)
│   │       ├── aggregate-root.ts
│   │       ├── base-entity.ts
│   │       ├── domain-event.ts
│   │       ├── entity.interface.ts
│   │       ├── guard.ts
│   │       ├── index.ts
│   │       ├── result.ts
│   │       ├── unique-entity-id.vo.ts
│   │       └── value-object.ts
│   │
│   ├── modules/                   # All business modules (existing + new)
│   │   ├── project/
│   │   ├── building/
│   │   ├── extract/
│   │   ├── ... (42 total)
│   │   │
│   │   ├── domain-events/         # NEW: Event-driven architecture
│   │   │   ├── domain-events.module.ts
│   │   │   ├── domain-events.service.ts
│   │   │   ├── domain-events.controller.ts
│   │   │   ├── event-bus.impl.ts
│   │   │   ├── event-store.service.ts
│   │   │   ├── domain/
│   │   │   │   ├── event-bus.interface.ts
│   │   │   │   ├── domain-event.entity.ts
│   │   │   │   ├── event-handler.interface.ts
│   │   │   │   ├── event-store.interface.ts
│   │   │   │   └── event-store.entity.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── in-memory-event-bus.ts
│   │   │   │   ├── prisma-event-store.ts
│   │   │   │   └── event-dispatcher.service.ts
│   │   │   └── events/            # All domain event classes
│   │   │       ├── project.events.ts
│   │   │       ├── extract.events.ts
│   │   │       ├── payment.events.ts
│   │   │       ├── attendance.events.ts
│   │   │       ├── fund.events.ts
│   │   │       ├── boq.events.ts
│   │   │       └── ...
│   │   │
│   │   ├── file/                  # NEW: File Management Service
│   │   │   ├── file.module.ts
│   │   │   ├── file.controller.ts
│   │   │   ├── file.service.ts
│   │   │   ├── domain/
│   │   │   │   ├── file.entity.ts
│   │   │   │   ├── file.repository.ts
│   │   │   │   ├── file.interface.ts
│   │   │   │   └── file-storage-provider.interface.ts
│   │   │   └── infrastructure/
│   │   │       ├── prisma-file.repository.ts
│   │   │       ├── storage/
│   │   │       │   ├── storage-registry.service.ts
│   │   │       │   ├── local-file-storage.provider.ts
│   │   │       │   ├── s3-file-storage.provider.ts
│   │   │       │   └── gcs-file-storage.provider.ts
│   │   │       └── image-processing.service.ts
│   │   │
│   │   ├── search-engine/         # NEW: Global Search Engine
│   │   │   ├── search-engine.module.ts
│   │   │   ├── search-engine.controller.ts
│   │   │   ├── search-engine.service.ts
│   │   │   ├── domain/
│   │   │   │   ├── search-engine.interface.ts
│   │   │   │   ├── indexable-entity.interface.ts
│   │   │   │   └── search-query.interface.ts
│   │   │   ├── indexers/
│   │   │   │   ├── indexer-registry.service.ts
│   │   │   │   ├── project.indexer.ts
│   │   │   │   ├── building.indexer.ts
│   │   │   │   └── ...
│   │   │   ├── strategies/
│   │   │   │   ├── keyword-search.strategy.ts
│   │   │   │   ├── semantic-search.strategy.ts
│   │   │   │   └── hybrid-search.strategy.ts
│   │   │   └── infrastructure/
│   │   │       └── search-index.provider.ts
│   │   │
│   │   ├── settings/              # NEW: Global Settings Architecture
│   │   │   ├── settings.module.ts
│   │   │   ├── settings.controller.ts
│   │   │   ├── settings.service.ts
│   │   │   ├── accessors/
│   │   │   │   ├── company-settings.ts
│   │   │   │   ├── branding-settings.ts
│   │   │   │   ├── finance-settings.ts
│   │   │   │   ├── attendance-settings.ts
│   │   │   │   ├── ai-settings.ts
│   │   │   │   ├── reporting-settings.ts
│   │   │   │   ├── notification-settings.ts
│   │   │   │   ├── security-settings.ts
│   │   │   │   ├── email-settings.ts
│   │   │   │   ├── workflow-settings.ts
│   │   │   │   ├── theme-settings.ts
│   │   │   │   └── backup-settings.ts
│   │   │   ├── domain/
│   │   │   │   ├── setting.entity.ts
│   │   │   │   ├── setting.repository.ts
│   │   │   │   └── setting.interface.ts
│   │   │   └── infrastructure/
│   │   │       └── prisma-setting.repository.ts
│   │   │
│   │   ├── import-export/         # NEW: Import/Export Engine
│   │   │   ├── import-export.module.ts
│   │   │   ├── import-export.controller.ts
│   │   │   ├── import-export.service.ts
│   │   │   ├── domain/
│   │   │   │   ├── import-export-handler.interface.ts
│   │   │   │   ├── import-result.interface.ts
│   │   │   │   └── format-type.enum.ts
│   │   │   └── infrastructure/
│   │   │       ├── handler-registry.service.ts
│   │   │       └── formats/
│   │   │           ├── format-provider.interface.ts
│   │   │           ├── excel-format.provider.ts
│   │   │           ├── csv-format.provider.ts
│   │   │           └── json-format.provider.ts
│   │   │
│   │   ├── timeline/              # NEW: Entity Timeline Service
│   │   │   ├── timeline.module.ts
│   │   │   ├── timeline.controller.ts
│   │   │   ├── timeline.service.ts
│   │   │   ├── timeline.subscriber.ts
│   │   │   ├── domain/
│   │   │   │   ├── timeline-event.entity.ts
│   │   │   │   ├── timeline.repository.ts
│   │   │   │   └── timeline-entry.interface.ts
│   │   │   └── infrastructure/
│   │   │       └── prisma-timeline.repository.ts
│   │   │
│   │   ├── notification-engine/   # NEW: Notification Engine
│   │   │   ├── notification-engine.module.ts
│   │   │   ├── notification-engine.service.ts
│   │   │   ├── notification-engine.subscriber.ts
│   │   │   ├── domain/
│   │   │   │   ├── notification-provider.interface.ts
│   │   │   │   ├── notification-template.interface.ts
│   │   │   │   ├── notification-message.interface.ts
│   │   │   │   └── notification-channel.enum.ts
│   │   │   └── infrastructure/
│   │   │       ├── providers/
│   │   │       │   ├── provider-registry.service.ts
│   │   │       │   ├── in-app-notification.provider.ts
│   │   │       │   ├── email-notification.provider.ts
│   │   │       │   ├── whatsapp-notification.provider.ts
│   │   │       │   └── push-notification.provider.ts
│   │   │       ├── templates/
│   │   │       │   ├── notification-template.service.ts
│   │   │       │   └── template-renderer.service.ts
│   │   │       └── email/
│   │   │           ├── email.config.ts
│   │   │           └── email.service.ts
│   │   │
│   │   ├── queue/                 # NEW: Queue Management
│   │   │   ├── queue.module.ts
│   │   │   ├── queue.service.ts
│   │   │   ├── queue.config.ts
│   │   │   ├── domain/
│   │   │   │   ├── job.entity.ts
│   │   │   │   ├── job-type.enum.ts
│   │   │   │   └── job-repository.interface.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── bull-queue.provider.ts
│   │   │   │   └── prisma-job-repository.ts
│   │   │   └── workers/
│   │   │       ├── pdf/
│   │   │       ├── ai/
│   │   │       ├── kpi/
│   │   │       ├── notification/
│   │   │       ├── report/
│   │   │       ├── email/
│   │   │       ├── audit/
│   │   │       ├── backup/
│   │   │       ├── search/
│   │   │       └── maintenance/
│   │   │
│   │   ├── scheduler/             # NEW: Scheduler
│   │   │   ├── scheduler.module.ts
│   │   │   ├── scheduler.registry.ts
│   │   │   ├── scheduler.service.ts
│   │   │   ├── domain/
│   │   │   │   └── scheduled-job.interface.ts
│   │   │   └── jobs/
│   │   │       ├── daily-backup.job.ts
│   │   │       ├── monthly-kpi-snapshot.job.ts
│   │   │       ├── weekly-reports.job.ts
│   │   │       ├── daily-attendance-summary.job.ts
│   │   │       ├── daily-cashflow-summary.job.ts
│   │   │       ├── contractor-performance.job.ts
│   │   │       ├── ai-reindex.job.ts
│   │   │       ├── cleanup-temp-files.job.ts
│   │   │       └── cleanup-expired-tokens.job.ts
│   │   │
│   │   ├── monitor/               # NEW: System Monitoring
│   │   │   ├── monitor.module.ts
│   │   │   ├── monitor.controller.ts
│   │   │   ├── monitor.service.ts
│   │   │   ├── domain/
│   │   │   │   ├── system-health.interface.ts
│   │   │   │   ├── system-metrics.interface.ts
│   │   │   │   └── system-event.interface.ts
│   │   │   └── infrastructure/
│   │   │       ├── health-checkers/
│   │   │       │   ├── database-health.checker.ts
│   │   │       │   ├── redis-health.checker.ts
│   │   │       │   ├── queue-health.checker.ts
│   │   │       │   ├── ai-health.checker.ts
│   │   │       │   ├── embedding-health.checker.ts
│   │   │       │   ├── vector-store-health.checker.ts
│   │   │       │   ├── worker-health.checker.ts
│   │   │       │   ├── storage-health.checker.ts
│   │   │       │   └── system-load.checker.ts
│   │   │       └── metrics/
│   │   │           ├── metrics-collector.service.ts
│   │   │           └── metrics-store.service.ts
│   │   │
│   │   ├── setup-wizard/          # NEW: Company Setup Wizard
│   │   │   ├── setup-wizard.module.ts
│   │   │   ├── setup-wizard.controller.ts
│   │   │   ├── setup-wizard.service.ts
│   │   │   ├── setup-wizard.guard.ts
│   │   │   ├── domain/
│   │   │   │   ├── setup-state.entity.ts
│   │   │   │   ├── setup-state.repository.ts
│   │   │   │   └── setup-step.enum.ts
│   │   │   ├── dto/
│   │   │   │   ├── company-info.dto.ts
│   │   │   │   ├── branding.dto.ts
│   │   │   │   ├── finance-defaults.dto.ts
│   │   │   │   ├── create-admin.dto.ts
│   │   │   │   └── work-schedule.dto.ts
│   │   │   └── infrastructure/
│   │   │       └── prisma-setup-state.repository.ts
│   │   │
│   │   └── ai-agent/              # Extended: AI-First Agent
│   │       ├── ai-agent.controller.ts
│   │       ├── ai-agent.module.ts
│   │       ├── ai-agent.service.ts
│   │       ├── analytics/
│   │       ├── chaining/
│   │       ├── context/
│   │       ├── dto/
│   │       ├── evaluation/
│   │       ├── knowledge/
│   │       ├── memory/
│   │       ├── nl/
│   │       ├── permissions/
│   │       ├── planner/
│   │       ├── tools/             # Extended: Full tool catalog
│   │       │   ├── tool-registry.service.ts
│   │       │   ├── project-tools.ts
│   │       │   ├── extract-tools.ts
│   │       │   ├── payment-tools.ts
│   │       │   ├── treasury-tools.ts
│   │       │   ├── boq-tools.ts
│   │       │   ├── knowledge-tools.ts
│   │       │   ├── timeline-tools.ts
│   │       │   ├── search-tools.ts
│   │       │   ├── settings-tools.ts
│   │       │   └── bi-tools.ts
│   │       └── workflows/         # Extended: Multi-step workflows
│   │           ├── workflow-registry.service.ts
│   │           ├── project-analysis.workflow.ts
│   │           ├── extract-approval.workflow.ts
│   │           ├── payment-approval.workflow.ts
│   │           └── knowledge-query.workflow.ts
│   │
│   ├── auth/                      # Auth module (existing)
│   ├── users/                     # Users module (existing)
│   ├── health/                    # Health module (existing)
│   └── prisma/                    # Prisma service (existing)
│
└── docs/
    ├── FINAL_ARCHITECTURE.md      # THIS FILE
    ├── BACKEND_MIGRATION_PLAN.md  # Phased implementation plan
    └── KNOWLEDGE_ARCHITECTURE.md  # Knowledge/AI architecture
```

### New Prisma Models

```prisma
model EventStoreRecord { /* §4 */ }
model TimelineEvent { /* §7 */ }
model FileRecord { /* §8 */ }
model Setting { /* §11 */ }
model SettingChangeLog { /* §11 */ }
```

### New Dependencies

| Package | Purpose |
|---------|---------|
| `@nestjs/bull` + `bullmq` | Queue management |
| `ioredis` | Redis client for queue + cache |
| `@nestjs/schedule` | Cron/scheduler |
| `exceljs` (or `xlsx`) | Excel import/export |
| `csv-parse` + `csv-stringify` | CSV import/export |
| `nodemailer` | Email delivery |
| `sharp` | Image processing (resize, optimize) |
| `handlebars` | Notification template rendering |

---

## Summary of Additions

| Requirement | New Interfaces | New Modules | New Services | New Tables |
|-------------|---------------|-------------|-------------|------------|
| **1. Event-Driven Architecture** | `EventBus`, `EventHandler`, `EventStore` | `domain-events` | EventBus impl, EventStore, Dispatcher | `EventStoreRecord` |
| **2. Background Processing** | `JobQueue` | `queue` (+ workers) | QueueService, workers | — |
| **3. Scheduler** | `ScheduledJob` | `scheduler` | SchedulerRegistry, SchedulerService | — |
| **4. Entity Timeline** | `TimelineService` | `timeline` | TimelineService, TimelineSubscriber | `TimelineEvent` |
| **5. File Management** | `FileService`, `FileStorageProvider` | `file` (+ providers) | FileService, StorageRegistry, ImageProcessing | `FileRecord` |
| **6. Global Search** | `SearchEngine`, `IndexableEntity`, `SearchStrategy`, `SearchIndexer` | `search-engine` (+ indexers) | SearchEngineService, IndexerRegistry | — |
| **7. Notification Engine** | `NotificationProvider`, `NotificationTemplate` | `notification-engine` (+ providers) | NotificationService, TemplateService, ProviderRegistry | — |
| **8. Global Settings** | `SettingsService`, `SettingsAccessor` | `settings` (+ accessors) | SettingsService, AccessorRegistry | `Setting`, `SettingChangeLog` |
| **9. Import/Export** | `ImportExportHandler`, `FormatProvider` | `import-export` (+ formats) | ImportExportService, HandlerRegistry | — |
| **10. System Monitoring** | `MonitoringService`, `HealthChecker` | `monitor` (+ checkers) | MonitorService, MetricsCollector | — |
| **11. Setup Wizard** | — | `setup-wizard` | SetupWizardService, SetupWizardGuard | SetupState (config) |
| **12. AI-First Vision** | `AITool` | Extended `ai-agent` | ToolRegistry, WorkflowRegistry | — |
| **13. Architecture Principles** | — | DDD kernel (existing) | — | — |

---

## Next Steps

1. ✅ Get architecture approval
2. ⏳ Begin Phase B — Core Finance implementation (Projects → Treasury → Fund → Extracts)
3. ⏳ Implement infrastructure modules in this order:
   - P0: Settings, Domain Events, File Service, Setup Wizard
   - P1: Timeline, Queue, Scheduler, Notification Engine
   - P2: Search Engine, Monitoring, Import/Export
4. ⏳ Business modules follow per `docs/BACKEND_MIGRATION_PLAN.md`
5. ⏳ AI Agent tools and workflows implemented alongside business modules

---

*End of Final Architecture Document v2.0.0*
