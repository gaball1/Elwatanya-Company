# Enterprise Knowledge Intelligence — Architecture Document

> **Status:** Design Review  
> **Target Module:** `backend/src/modules/knowledge/`  
> **Frontend:** `frontend/app/[locale]/(dashboard)/admin/knowledge/`  
> **Version:** 1.0.0  
> **Last Updated:** 2026-07-30

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Design](#2-database-design)
3. [DDD Module Structure](#3-ddd-module-structure)
4. [Provider Abstractions](#4-provider-abstractions)
5. [Embedding Layer](#5-embedding-layer)
6. [Vector Store Layer](#6-vector-store-layer)
7. [Parser Pipeline](#7-parser-pipeline)
8. [Chunk Engine](#8-chunk-engine)
9. [Metadata System](#9-metadata-system)
10. [Hybrid Search](#10-hybrid-search)
11. [Versioning](#11-versioning)
12. [Retrieval Flow](#12-retrieval-flow)
13. [AI Integration Flow](#13-ai-integration-flow)
14. [Source Citation](#14-source-citation)
15. [Security Model (RBAC)](#15-security-model-rbac)
16. [Construction Intelligence](#16-construction-intelligence)
17. [Performance & Scaling](#17-performance--scaling)
18. [Observability](#18-observability)
19. [Future Roadmap](#19-future-roadmap)
20. [Appendix: Interfaces](#20-appendix-interfaces)

---

## 1. Architecture Overview

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Admin UI     │  │ AI Agent     │  │ Third-party API      │  │
│  │ (Upload/     │  │ (Chat/       │  │ (Future: Zapier,     │  │
│  │  Manage)     │  │  Search)     │  │  Power Automate)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼─────────────────────┼──────────────┘
          │                 │                     │
┌─────────▼─────────────────▼─────────────────────▼──────────────┐
│                      API Gateway (NestJS)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Knowledge Module Controller                  │  │
│  │  POST /upload │ GET /documents │ POST /search │ DELETE   │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                      │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │                  Use Cases Layer                          │  │
│  │  UploadDocument │ ListDocuments │ SearchDocuments │ ...  │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                      │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │                   Domain Layer                            │  │
│  │  KnowledgeDocument (Aggregate) │ KnowledgeChunk (Value)   │  │
│  │  DocumentParser (Interface)    │ ChunkEngine (Strategy)   │  │
│  │  EmbeddingProvider (Interface) │ VectorStore (Interface)  │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                      │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │                Infrastructure Layer                       │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐   │  │
│  │  │Parsers  │ │Embedding │ │Vector  │ │Prisma        │   │  │
│  │  │(PDF/    │ │(OpenAI/  │ │Store   │ │Repository    │   │  │
│  │  │ DOCX/   │ │Ollama/   │ │(Memory/│ │              │   │  │
│  │  │ XLSX)   │ │TF-IDF)   │ │pgvector)│ │              │   │  │
│  │  └─────────┘ └──────────┘ └────────┘ └──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Upload → Search

```
Upload → Parse → Chunk → Embed → Store → Index
                                            │
Search ──► Query Analysis ──► Hybrid Search ──► Rank ──► Cite
              │                                   │
         [Semantic  Keyword  Metadata]      [Source Attach]
```

---

## 2. Database Design

### Prisma Schema

```prisma
// Enable pgvector extension
// Run: CREATE EXTENSION IF NOT EXISTS vector;

/// Stores document-level metadata and version history
model KnowledgeDocument {
  id               String             @id @default(uuid())
  
  // Core identity
  title            String
  fileName         String
  fileType         String             // pdf, docx, xlsx, txt, md, csv
  fileSize         Int                // bytes
  filePath         String             // disk/S3 path
  
  // Classification
  category         String             @default("general")
  documentType     String             @default("other") // contract, boq, specification, report, drawing, photo, etc.
  tags             String[]
  language         String             @default("ar")    // ar, en, bilingual
  
  // ERP associations
  department       String?
  projectId        String?
  buildingId       String?
  
  // Contract-specific metadata
  contractNumber   String?
  specificationSection String?
  drawingNumber    String?
  revision         String?
  
  // Versioning
  version          Int                @default(1)
  rootDocumentId   String?            // points to the original document (for version chain)
  status           String             @default("current") // draft, current, archived, superseded
  
  // Approval
  approvalState    String             @default("pending") // pending, approved, rejected
  
  // Ownership
  uploadedById     String?
  uploadedByName   String?
  
  // Embedding state
  embeddingStatus  String             @default("pending") // pending, processing, completed, failed
  chunkCount       Int                @default(0)
  
  // Timestamps
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  deletedAt        DateTime?
  
  // Relations
  chunks           KnowledgeChunk[]
  versions         KnowledgeDocument[] @relation("DocumentVersioning")
  rootDocument     KnowledgeDocument?  @relation("DocumentVersioning", fields: [rootDocumentId], references: [id])
  
  @@index([projectId])
  @@index([buildingId])
  @@index([department])
  @@index([category])
  @@index([documentType])
  @@index([status])
  @@index([rootDocumentId])
  @@index([tags])
}

/// Stores individual chunks with embeddings
model KnowledgeChunk {
  id              String             @id @default(uuid())
  documentId      String
  
  // Content
  content         String             // Text content of this chunk
  contentHash     String             // SHA-256 for deduplication
  
  // Position
  chunkIndex      Int
  pageNumber      Int?
  section         String?
  paragraph       Int?
  
  // BOQ-specific
  boqItemCode     String?
  
  // Chunk strategy metadata
  strategy        String             @default("recursive") // fixed, recursive, heading, table, code, boq
  
  // Embedding
  // embedding    Unsupported("vector(1536)")?  // pgvector - dimension depends on provider
  // For now stored in-memory vector store, Postgres stores metadata only
  
  // Metadata filter values (denormalized for fast filtering)
  projectId       String?
  buildingId      String?
  department      String?
  category        String?
  documentType    String?
  language        String?
  tags            String[]
  version         Int?
  documentStatus  String?
  approvalState   String?
  
  // Additional flexible metadata
  metadata        Json?              // Any extra key-value pairs
  
  // Timestamps
  createdAt       DateTime           @default(now())
  
  // Relations
  document        KnowledgeDocument  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@index([documentId])
  @@index([contentHash])
  @@index([projectId])
  @@index([buildingId])
  @@index([department])
  @@index([category])
  @@index([documentType])
  @@index([tags])
  @@index([chunkIndex])
}
```

### Design Rationale

- **No embedding column on Prisma**: Embeddings are stored in the dedicated vector store (in-memory or pgvector). This avoids coupling the relational schema to any vector dimension or provider.
- **Denormalized filter fields on chunks**: Enables fast metadata filtering without joins. The alternative (joining through documents) becomes expensive at millions of chunks.
- **Content hash**: Prevents duplicate chunk indexing on re-uploads.
- **Root document ID**: The version chain. All versions of a document share the same `rootDocumentId`, with the latest `status='current'` being the active one.
- **Soft delete**: All documents are soft-deleted for recovery.

---

## 3. DDD Module Structure

```
src/modules/knowledge/
├── knowledge.module.ts
├── knowledge.controller.ts
│
├── dto/                              # External/API DTOs (class-validator + Swagger)
│   ├── upload-document.dto.ts
│   ├── list-documents.dto.ts
│   ├── search-documents.dto.ts
│   └── update-document.dto.ts
│
├── domain/
│   ├── knowledge.aggregate.ts        # KnowledgeDocument AggregateRoot
│   ├── knowledge-chunk.entity.ts     # KnowledgeChunk entity
│   ├── knowledge.repository.ts       # Repository interface + symbol
│   ├── embedding-provider.interface.ts
│   ├── vector-store.interface.ts
│   ├── document-parser.interface.ts
│   └── chunk-engine.interface.ts
│
├── application/
│   ├── dto/                          # Internal application DTOs (interfaces)
│   │   ├── document.dto.ts
│   │   └── search.dto.ts
│   │
│   ├── use-cases/
│   │   ├── upload-document.use-case.ts
│   │   ├── list-documents.use-case.ts
│   │   ├── get-document.use-case.ts
│   │   ├── delete-document.use-case.ts
│   │   ├── search-documents.use-case.ts
│   │   ├── reindex-document.use-case.ts
│   │   └── update-document-metadata.use-case.ts
│   │
│   └── services/
│       ├── rag-pipeline.service.ts       # Orchestrates: chunk → embed → store → index
│       ├── hybrid-retriever.service.ts   # Semantic + keyword + metadata search
│       ├── citation-engine.service.ts    # Source tracking and formatting
│       └── index-queue.service.ts        # Async background indexing
│
├── infrastructure/
│   ├── prisma-knowledge.repository.ts    # Prisma implementation
│   │
│   ├── parsers/                          # Plugin-based parsers
│   │   ├── parser-registry.service.ts    # Discovers + routes to correct parser
│   │   ├── pdf-parser.service.ts
│   │   ├── docx-parser.service.ts
│   │   ├── xlsx-parser.service.ts
│   │   ├── csv-parser.service.ts
│   │   ├── text-parser.service.ts
│   │   └── markdown-parser.service.ts
│   │
│   ├── chunking/
│   │   ├── chunk-engine.service.ts       # Strategy dispatcher
│   │   ├── strategies/
│   │   │   ├── fixed-size.strategy.ts
│   │   │   ├── recursive.strategy.ts
│   │   │   ├── heading-aware.strategy.ts
│   │   │   ├── table-aware.strategy.ts
│   │   │   └── boq-aware.strategy.ts
│   │   └── chunk-config.dto.ts
│   │
│   ├── embedding/
│   │   ├── embedding-registry.service.ts  # Provider registry
│   │   ├── providers/
│   │   │   ├── tfidf-embedding.provider.ts
│   │   │   └── openai-embedding.provider.ts
│   │   └── embedding-config.ts
│   │
│   └── vector-store/
│       ├── vector-store-registry.service.ts
│       ├── stores/
│       │   ├── in-memory-vector.store.ts
│       │   └── pgvector-vector.store.ts
│       └── vector-store-config.ts
│
└── knowledge-analytics.service.ts    # Observability tracking
```

---

## 4. Provider Abstractions

### Design Principle

Every external dependency (embedding, vector store, parser) is behind an **interface + registry + config** pattern:

```
Interface ← Registry (discovers providers by config key) ← Config (hot-swappable)
```

Configuration-driven switching:

```typescript
// .env or config
KNOWLEDGE_EMBEDDING_PROVIDER=openai     # openai | azure-openai | gemini | voyage | ollama | tfidf
KNOWLEDGE_VECTOR_STORE=in-memory         # in-memory | pgvector | qdrant | pinecone | weaviate | milvus
KNOWLEDGE_PARSERS=pdf,docx,xlsx,csv      # comma-separated active parsers
```

---

## 5. Embedding Layer

### Interface

```typescript
interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;

  embed(text: string): Promise<EmbeddingVector>;
  embedMany(texts: string[]): Promise<EmbeddingVector[]>;
}

type EmbeddingVector = number[]; // float array of `dimensions` length
```

### Provider Table

| Provider       | Dimensions | Auth Method     | Use Case              |
|----------------|-----------|-----------------|-----------------------|
| TF-IDF         | configurable | None           | Dev/testing fallback  |
| OpenAI         | 1536 / 3072  | API Key        | Production primary    |
| Azure OpenAI   | 1536 / 3072  | API Key + Endpoint | Enterprise Azure |
| Gemini         | 768          | API Key        | Google ecosystem      |
| Voyage AI      | 1024 / 1536  | API Key        | Legal/construction    |
| Ollama         | model-dependent | None (local) | On-premise, private   |

### Registry Pattern

```typescript
@Injectable()
class EmbeddingRegistry {
  private providers = new Map<string, EmbeddingProvider>();

  register(name: string, provider: EmbeddingProvider): void;
  getActive(): EmbeddingProvider;  // Returns provider from config
  get(name: string): EmbeddingProvider;
}
```

### Embedding Pipeline

```
Raw Text → Normalize → Tokenize → Embed → Return Vector
                │
           [Strip BOM]
           [Normalize Unicode]
           [Strip HTML (if any)]
           [Detect Language]
```

---

## 6. Vector Store Layer

### Interface

```typescript
interface VectorStore {
  readonly name: string;

  upsert(chunks: StoredChunk[]): Promise<void>;
  delete(ids: string[]): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult[]>;
  count(filter?: MetadataFilter): Promise<number>;
  rebuildIndex(): Promise<void>;

  // Admin
  clear(): Promise<void>;
  health(): Promise<StoreHealth>;
}

interface StoredChunk {
  id: string;
  vector: EmbeddingVector;
  metadata: Record<string, any>; // All denormalized filter fields
  content: string;
}

interface SearchQuery {
  vector: EmbeddingVector;         // Semantic query vector
  keyword?: string;                 // Optional keyword/BM25 query
  filter?: MetadataFilter;         // Metadata constraints
  limit?: number;                  // Top-K results
  minScore?: number;               // Similarity threshold
}

interface SearchResult {
  id: string;
  score: number;                   // Similarity (0-1)
  content: string;
  metadata: Record<string, any>;
  source: string;                  // Which strategy found it (semantic/keyword)
}

interface MetadataFilter {
  projectId?: string | string[];
  buildingId?: string | string[];
  department?: string | string[];
  category?: string | string[];
  documentType?: string | string[];
  language?: string;
  tags?: string[];
  status?: string;
  approvalState?: string;
  version?: number;
  dateFrom?: Date;
  dateTo?: Date;
  // Any key-value pairs
  [key: string]: any;
}

interface StoreHealth {
  documentCount: number;
  chunkCount: number;
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
}
```

### Store Table

| Store       | Index Type      | Production Ready | Self-Hosted | Notes               |
|-------------|----------------|------------------|-------------|---------------------|
| In-Memory   | Brute-force    | ❌ (dev only)    | ✅          | No deps, fast dev   |
| pgvector    | IVFFlat / HNSW | ✅               | ✅          | Reuses PostgreSQL   |
| Qdrant      | HNSW           | ✅               | ✅          | Dedicated, fast     |
| Pinecone    | Proprietary    | ✅               | ❌ (SaaS)   | Fully managed       |
| Weaviate    | HNSW           | ✅               | ✅          | Graph + vector      |
| Milvus      | IVF/HNSW       | ✅               | ✅          | High-scale          |

### Hybrid Search Architecture

```
User Query
    │
    ├──► Semantic Search (Vector Store.search with query vector)
    │
    ├──► Keyword Search (BM25 / TF-IDF on chunk content)
    │
    ├──► Metadata Filtering (applied to both above)
    │
    └──► Ranking (Reciprocal Rank Fusion + score threshold)
              │
         [RRF Merge]
              │
         [Deduplicate]
              │
         [Top-K Results with Sources]
```

**Default RRF formula:**

```
RRF(d) = Σ 1 / (k + r(d, s))  where k=60
```

---

## 7. Parser Pipeline

### Interface

```typescript
interface DocumentParser {
  readonly supportedTypes: string[];  // ['pdf', 'docx', 'xlsx', ...]
  readonly displayName: string;

  supports(fileType: string): boolean;
  parse(file: ParserInput): Promise<ParsedDocument>;
}

interface ParserInput {
  filePath: string;
  fileType: string;
  fileName: string;
  encoding?: string;
}

interface ParsedDocument {
  content: string;                    // Extracted text
  metadata: {
    pageCount?: number;
    tableCount?: number;
    hasImages?: boolean;
    hasFormulas?: boolean;
    language?: string;
    title?: string;
    author?: string;
    createdAt?: Date;
    modifiedAt?: Date;
    // Parser-specific metadata
    [key: string]: any;
  };
  structure?: DocumentStructure[];    // Hierarchical structure
  warnings?: string[];                // Non-fatal parsing issues
}

interface DocumentStructure {
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'code' | 'boq-item';
  level?: number;                    // Heading level
  content: string;
  pageNumber?: number;
  section?: string;
}
```

### Parser Registry

```typescript
@Injectable()
class ParserRegistry {
  private parsers: DocumentParser[] = [];

  register(parser: DocumentParser): void;
  getParser(fileType: string): DocumentParser;
  getSupportedTypes(): string[];
}
```

### Parser Matrix

| Parser     | Library       | Extracts Text | Extracts Tables | Extracts Structure | Extracts Images (future) |
|-----------|---------------|:---:|:---:|:---:|:---:|
| PDF       | pdf-parse     | ✅  | ⚠️ (basic) | ⚠️ (headings if tagged) | ❌ (future: pdf.js) |
| DOCX      | mammoth       | ✅  | ✅  | ✅ (headings) | ❌ (future) |
| XLSX      | xlsx          | ✅  | ✅  | N/A | N/A |
| CSV       | Built-in      | ✅  | ✅  | N/A | N/A |
| TXT       | Built-in      | ✅  | N/A | N/A | N/A |
| Markdown  | Built-in      | ✅  | N/A | ✅ (headings, code blocks) | N/A |

### Future Parser Slots

| Parser       | Status    | Strategy                     |
|-------------|-----------|------------------------------|
| DWG         | 🔮 Future | AutoCAD .NET / LibreDWG     |
| DXF         | 🔮 Future | dxf-parser                   |
| IFC (BIM)   | 🔮 Future | ifc.js / xbim               |
| Images OCR  | 🔮 Future | Tesseract.js / Google Vision |
| EML         | 🔮 Future | mailparser                   |
| ZIP         | 🔮 Future | Recursive extraction         |

---

## 8. Chunk Engine

### Interface

```typescript
interface ChunkStrategy {
  readonly name: string;
  chunk(text: string, config: ChunkConfig): Promise<Chunk[]>;
}

interface Chunk {
  content: string;
  chunkIndex: number;
  strategy: string;
  pageNumber?: number;
  section?: string;
  paragraph?: number;
  boqItemCode?: string;
  metadata?: Record<string, any>;
}

interface ChunkConfig {
  chunkSize: number;        // Target characters per chunk (default: 1000)
  overlap: number;           // Overlap between chunks (default: 200)
  maxTokens?: number;        // Optional token limit (if provider known)
  language?: string;         // For language-aware splitting
}
```

### Strategy Table

| Strategy        | Use Case                      | Split Logic                         |
|----------------|-------------------------------|-------------------------------------|
| Fixed Size     | General, simple text          | Every N characters                  |
| Recursive      | Prose, documents              | Paragraph → sentence → word fallback |
| Heading Aware  | Structured docs (contracts, specs) | Split on headings, preserve hierarchy |
| Table Aware    | XLSX, tabular data            | Keep rows together, split at row boundaries |
| BOQ Aware      | BOQ items, specifications     | Per BOQ line item, preserve item code |
| Code Aware     | Code snippets, method statements | Split at function/class boundaries |

### Chunk Pipeline

```
Parsed Document
    │
    ├──► Detect dominant structure type (headings vs tables vs prose)
    │
    ├──► Select primary strategy (configurable, defaults to recursive)
    │
    ├──► Apply strategy → generate chunks with metadata
    │
    ├──► Post-process:
    │       ├── Merge very small chunks (< 50 chars) into adjacent
    │       ├── Validate overlap consistency
    │       └── Assign page/section/paragraph from source structure
    │
    └──► Return Chunk[]
```

### Chunk Configuration (per-upload or global)

```typescript
interface ChunkConfigDto {
  strategy?: 'fixed' | 'recursive' | 'heading' | 'table' | 'code' | 'boq';
  chunkSize?: number;        // 500-4000, default 1000
  overlap?: number;          // 0-500, default 200
  maxTokens?: number;        // optional
  language?: string;         // auto-detected if not provided
}
```

---

## 9. Metadata System

### Document-Level Metadata

| Field             | Type     | Searchable | Filterable | Required | Source                    |
|-------------------|----------|:----------:|:----------:|:--------:|---------------------------|
| id                | UUID     | ✅         | ✅         | ✅       | Auto                      |
| title             | String   | ✅         | ❌         | ✅       | User / File name          |
| fileName          | String   | ✅ (full)  | ❌         | ✅       | Upload                    |
| fileType          | String   | ✅         | ✅         | ✅       | MIME detection            |
| fileSize          | Int      | ❌         | ✅         | ✅       | Auto                      |
| category          | String   | ✅         | ✅         | ✅       | User (default "general")  |
| documentType      | String   | ✅         | ✅         | ✅       | User / Auto-detect        |
| tags              | String[] | ✅         | ✅         | ❌       | User                      |
| language          | String   | ✅         | ✅         | ✅       | Auto / User               |
| department        | String   | ✅         | ✅         | ❌       | User / Auto               |
| projectId         | String   | ✅         | ✅         | ❌       | User                      |
| buildingId        | String   | ✅         | ✅         | ❌       | User                      |
| contractNumber    | String   | ✅         | ✅         | ❌       | User                      |
| specificationSection | String | ✅        | ✅         | ❌       | User                      |
| drawingNumber     | String   | ✅         | ✅         | ❌       | User                      |
| revision          | String   | ✅         | ✅         | ❌       | User                      |
| version           | Int      | ❌         | ✅         | ✅       | Auto (incremented)        |
| status            | String   | ❌         | ✅         | ✅       | Auto                      |
| approvalState     | String   | ❌         | ✅         | ✅       | Auto / Workflow           |
| uploadedById      | String   | ❌         | ✅         | ❌       | Auto (from auth)          |
| createdAt         | DateTime | ❌         | ✅ (range) | ✅       | Auto                      |

### Chunk-Level Metadata (denormalized for fast filtering)

Same fields as document-level, copied at chunk time so filtering doesn't require a join.

Additional chunk-specific fields:

| Field       | Type   | Description                          |
|-------------|--------|--------------------------------------|
| pageNumber  | Int?   | Source page in PDF                   |
| section     | String? | Document section heading             |
| paragraph   | Int?   | Paragraph number within section      |
| boqItemCode | String? | BOQ item code (if applicable)        |
| chunkIndex  | Int    | Sequential position in document      |
| strategy    | String | Chunk strategy used                  |

### Flexible Metadata via JSON

```typescript
// metadata field on KnowledgeChunk
// Allows any additional key-value pairs without schema migration
{
  "estimatedDuration": "14 days",
  "materialGrade": "C40",
  "reinforcementRatio": "120 kg/m³",
  "weatherCondition": "Sunny",
  "inspectorName": "Ahmed Hassan"
}
```

---

## 10. Hybrid Search

### Search Pipeline

```
User Query String
    │
    ├──► Query Analysis
    │       ├── Extract metadata filters from query (NER-lite)
    │       │   "Show contracts for Project Tower A, Building B2"
    │       │   → projectId: "tower-a", buildingId: "b2"
    │       │
    │       ├── Detect query type
    │       │   → "penalty clause" = semantic
    │       │   → "Contract 2024-015" = keyword
    │       │
    │       └── Detect target document types
    │           → "contract" = documentType: "contract"
    │
    ├──► Embed query → queryVector (via active EmbeddingProvider)
    │
    ├──► Semantic Search
    │       search(vector: queryVector, filter: metadataFilter, limit: K*3)
    │
    ├──► Keyword Search
    │       tokenize(query) → BM25/TF-IDF scan on chunk content
    │       apply same metadataFilter
    │
    ├──► Merge (Reciprocal Rank Fusion)
    │       RRF(d) = Σ 1 / (k + r(d))
    │       where k = 60, r = rank position
    │
    ├──► Deduplicate (same chunk can be found by both strategies)
    │
    ├──► Score Threshold
    │       minScore = 0.3 (configurable)
    │
    ├──► Enrich with Source Citations
    │       For each result: fetch document metadata for citation
    │
    └──► Return Top-K (default: 10)
```

### Search DTO

```typescript
class SearchDocumentsDto {
  query: string;                    // Free-text search query

  // Optional metadata filters
  projectId?: string | string[];
  buildingId?: string | string[];
  department?: string | string[];
  category?: string | string[];
  documentType?: string | string[];
  tags?: string[];
  language?: string;
  status?: string;

  // Search tuning
  limit?: number;                   // Default: 10, Max: 50
  minScore?: number;                // Default: 0.3
  strategy?: 'hybrid' | 'semantic' | 'keyword';  // Default: hybrid
}
```

### Search Result

```typescript
interface SearchResultItem {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  source: 'semantic' | 'keyword' | 'hybrid';

  // Citation info
  document: {
    id: string;
    title: string;
    fileName: string;
    fileType: string;
    version: number;
    status: string;
  };
  location: {
    pageNumber?: number;
    section?: string;
    paragraph?: number;
  };
  metadata: {
    projectId?: string;
    buildingId?: string;
    department?: string;
    category?: string;
    documentType?: string;
    tags?: string[];
    [key: string]: any;
  };
}
```

---

## 11. Versioning

### Version States

```
                    ┌──────────┐
                    │  Draft   │
                    └────┬─────┘
                         │ submit
                    ┌────▼─────┐
              ┌─────┤  Current │◄──── Active version (default search target)
              │     └────┬─────┘
              │          │ new version uploaded
              │     ┌────▼──────┐
              │     │ Superseded │
              │     └────┬──────┘
              │          │
         ┌────▼────┐    │
         │ Archived│◄───┘
         └─────────┘
```

### Versioning Rules

1. First upload of a document → `version=1`, `status='current'`, `rootDocumentId=null`
2. Re-upload of same logical document (by title/category/project matching) → `version=N+1`, `status='current'`, `rootDocumentId=<original ID>`
3. Previous `current` document → `status='superseded'`
4. User can manually archive any version → `status='archived'`
5. AI agent searches only `status='current'` by default, unless explicitly asked about older versions
6. Deletion is soft-delete (`deletedAt`), never destroys version history
7. Re-indexing a new version creates new chunks; old version chunks remain for reference

### API Behavior

- `GET /api/v1/knowledge/documents` → lists only `status='current'` and `status!='archived'`
- `GET /api/v1/knowledge/documents?includeArchived=true` → includes all
- `GET /api/v1/knowledge/documents/:id/versions` → returns version chain
- `POST /api/v1/knowledge/upload` with same `title+project` → creates new version, marks old as superseded
- AI agent search defaults to `status='current'` filter

---

## 12. Retrieval Flow (RAG Pipeline)

### Upload → Index Pipeline

```
POST /api/v1/knowledge/upload (multipart: file + metadata)
    │
    ├──► 1. Validate file type + size
    │
    ├──► 2. Save file to disk (or S3 in future)
    │
    ├──► 3. Create KnowledgeDocument record (status: 'pending')
    │
    ├──► 4. Detect version chain (same title+project? → create new version)
    │
    ├──► 5. Dispatch async index job
    │
    └──► Return { documentId, status: 'pending' }

Async Index Job:
    │
    ├──► 1. Update status → 'processing'
    │
    ├──► 2. Find parser via ParserRegistry.getParser(fileType)
    │       │
    │       ├──► PDF  → pdf-parse
    │       ├──► DOCX → mammoth
    │       ├──► XLSX → xlsx
    │       ├──► CSV  → csv-parser
    │       ├──► TXT  → built-in
    │       └──► MD   → built-in (strips markdown syntax, preserves structure)
    │
    ├──► 3. Parse → ParsedDocument (text + structure + metadata)
    │
    ├──► 4. Chunk via ChunkEngine → Chunk[]
    │
    ├──► 5. For each chunk: embed via EmbeddingProvider.embedMany(chunks[])
    │
    ├──► 6. Store vectors in VectorStore.upsert(chunksWithVectors)
    │
    ├──► 7. Store chunks in Prisma (KnowledgeChunk records)
    │
    ├──► 8. Update KnowledgeDocument: status='current', chunkCount=N, embeddingStatus='completed'
    │
    └──► 9. Track metrics: parsingTime, embeddingTime, chunkCount
```

### Search → Answer Pipeline (AI Integration)

```
User asks: "What is the delay penalty in Contract X?"
    │
    ├──► 1. Planner detects knowledge_question intent (see §13)
    │
    ├──► 2. AI Agent executes search_knowledge tool
    │       │
    │       ├──► Hybrid Search on Vector Store
    │       ├──► Apply metadata filters (documentType=contract, projectId=X)
    │       └──► Return Top-5 relevant chunks
    │
    ├──► 3. Create Citations from chunks
    │       ├──► Document title, version, page, section, paragraph
    │       └──► Confidence score
    │
    ├──► 4. Build LLM prompt with:
    │       ├──► Context: retrieved chunks with citations
    │       ├──► Instruction: "Answer based ONLY on the provided context. Cite sources."
    │       └──► User query
    │
    ├──► 5. LLM generates answer with inline citations
    │
    └──► 6. Return { answer, citations: [...] }
```

---

## 13. AI Integration Flow

### Planner Integration

The existing `planner.service.ts` gains new intent detection:

```typescript
// New intents in IntentCategory
KNOWLEDGE_QUERY      // "What does Contract X say about penalties?"
KNOWLEDGE_FUSION     // "Why wasn't contractor paid?" (ERP + knowledge)
DOCUMENT_SEARCH      // "Find all contracts mentioning insurance"
DOCUMENT_SUMMARY     // "Summarize this contract"
DOCUMENT_COMPARISON  // "Compare Contract A and B"
```

### Detection Rules

| User Query Pattern | Intent | Action |
|---|---|---|
| "What does [document] say about [topic]?" | KNOWLEDGE_QUERY | Hybrid search → LLM answer |
| "Find [document type] mentioning [keyword]" | DOCUMENT_SEARCH | Hybrid search → list results |
| "Summarize [document]" | DOCUMENT_SUMMARY | Retrieve all chunks → LLM summary |
| "Compare [doc A] and [doc B]" | DOCUMENT_COMPARISON | Retrieval Augmented Comparison |
| "Why wasn't [entity] [action]?" | KNOWLEDGE_FUSION | ERP search + knowledge search → fusion |
| "Show all documents for [project]" | DOCUMENT_SEARCH | Metadata filter search |

### Knowledge-Only Query Flow

```
User
  │
  ▼
Planner.classify(query)
  │
  ├── intent: KNOWLEDGE_QUERY
  │
  ▼
search_knowledge tool
  │
  ├── Extract metadata filters from query (NER)
  ├── Hybrid search
  │
  ▼
LLM.generate(context=citations, query=userQuery)
  │
  ▼
Response { answer, citations: [...] }
```

### Knowledge Fusion Flow (ERP + Documents)

```
User: "Why wasn't contractor X paid for Extract Y?"
  │
  ▼
Planner.classify(query)
  │
  ├── intent: KNOWLEDGE_FUSION
  │
  ▼
ai-agent.service.ts orchestrator
  │
  ├── 1. ERP Leg:
  │       ├── Use existing tools (getExtract, getPayment, getApproval)
  │       ├── Gather: extract status, payment records, approvals
  │       └── Result: "Extract was submitted but not approved"
  │
  ├── 2. Knowledge Leg:
  │       ├── search_knowledge(query + context from ERP leg)
  │       ├── Filter: documentType=contract, project=X
  │       └── Result: "Clause 7.2 requires 14-day approval window"
  │
  ├── 3. Fusion:
  │       ├── Combine both contexts
  │       ├── LLM generates unified explanation
  │       └── Sources: ERP entities + document citations
  │
  ▼
Response: "Contractor X was not paid because..."
  ├── ERP: Extract Y status = pending approval
  ├── Knowledge: Contract Clause 7.2 (page 14) requires 14-day review
  └── Fusion: The extract has not been approved yet, and the contract
              allows up to 14 days for review (submitted 10 days ago).
```

---

## 14. Source Citation

### Citation Format

Every citation from a document includes:

```typescript
interface SourceCitation {
  documentId: string;
  documentTitle: string;
  documentFileName: string;
  fileType: string;
  version: number;
  pageNumber?: number;
  section?: string;
  paragraph?: number;
  confidence: number;       // Similarity score (0-1)
  excerpt: string;          // The matched text (first 200 chars)
  url?: string;             // Download/view link (future)
}
```

### Response Format

```json
{
  "answer": "According to Contract 2024-015, Clause 7.2, the delay penalty is 0.5% of the contract value per day, capped at 10% of the total contract value. This applies when the contractor exceeds the agreed timeline without an approved extension.",
  "citations": [
    {
      "documentTitle": "Contract 2024-015 - Tower A Construction",
      "documentId": "abc-123",
      "version": 2,
      "pageNumber": 14,
      "section": "Clause 7.2",
      "paragraph": 3,
      "confidence": 0.94,
      "excerpt": "Delay Penalty: The Contractor shall pay 0.5% of contract value per day for delays..."
    }
  ]
}
```

### LLM Prompt Template for Citation-Anchored Answers

```
You are a construction document analyst. Answer the user's question
using ONLY the provided context. If the context does not contain the
answer, say "I could not find information about this in the available documents."

For each fact you state, cite the source using [1], [2], etc.
At the end, list the full citations.

Context:
---
[1] Document: Contract 2024-015 (v2), Page 14, Clause 7.2, Paragraph 3
Content: Delay Penalty: The Contractor shall pay 0.5%...

[2] Document: Contract 2024-015 (v2), Page 15, Clause 8.1, Paragraph 1
Content: Force Majeure: Neither party shall be liable for delays caused by...
---

Question: What is the delay penalty?
```

### Anti-Hallucination Measures

1. **Context-grounded generation**: LLM sees only retrieved chunks, not its training data
2. **Citation anchoring**: Every statement must cite a source
3. **Confidence threshold**: Results below `minScore` (default 0.3) are excluded
4. **"Not found" fallback**: Explicit response when no relevant context exists
5. **Metadata verification**: Document existence is verified before citing
6. **Version check**: AI is informed which document version is active

---

## 15. Security Model (RBAC)

### Permission Scheme

```typescript
Permissions.Knowledge = {
  Read: 'knowledge.read',       // Search and view documents
  Create: 'knowledge.create',    // Upload new documents
  Update: 'knowledge.update',    // Edit metadata, re-index
  Delete: 'knowledge.delete',    // Soft-delete documents
  Admin: 'knowledge.admin',      // Full access, including version management
};
```

### Access Control Matrix

| Action | knowledge.read | knowledge.create | knowledge.update | knowledge.delete | knowledge.admin |
|--------|:---:|:---:|:---:|:---:|:---:|
| Search documents | ✅ | ❌ | ❌ | ❌ | ❌ |
| View document content | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload document | ❌ | ✅ | ❌ | ❌ | ❌ |
| Edit metadata | ❌ | ❌ | ✅ | ❌ | ❌ |
| Re-index | ❌ | ❌ | ✅ | ❌ | ✅ |
| Delete document | ❌ | ❌ | ❌ | ✅ | ✅ |
| View all versions | ❌ | ❌ | ❌ | ❌ | ✅ |
| Permanently delete | ❌ | ❌ | ❌ | ❌ | ✅ |

### Document-Level Access (Future)

When document-level RBAC is needed:

```typescript
interface DocumentAccess {
  documentId: string;
  userId?: string;
  roleId?: string;
  projectId?: string;
  accessLevel: 'read' | 'write' | 'admin';
}
```

- Users can see documents belonging to projects they are assigned to
- Department heads see documents for their department
- CEO/Admin sees everything
- AI agent enforces the same permissions as the frontend

### AI Agent Enforcement

When the AI Agent searches knowledge:

1. Get current user's permissions and project assignments
2. Automatically append `projectId IN user.projects[]` to the metadata filter
3. If user lacks `knowledge.read` permission → block the search entirely
4. If user has `knowledge.admin` → no filter restriction
5. Never expose document existence to unauthorized users

---

## 16. Construction Intelligence

### Domain-Specific Document Types

The architecture already supports these via the `documentType` field.
No structural changes needed to add new types:

| Document Type          | Priority | Future Considerations |
|-----------------------|:--------:|----------------------|
| Contract              | 🏗 Now    | Clause extraction, obligation tracking |
| BOQ (Bill of Quantities) | 🏗 Now | Line-item splitting, unit recognition |
| Specification         | 🏗 Now    | Section-aware chunking |
| Method Statement      | 🏗 Now    | Procedure step extraction |
| RFI (Request for Information) | 🔮 Future | Threading, reply tracking |
| Submittal             | 🔮 Future | Approval workflow integration |
| Shop Drawing          | 🔮 Future | DWG rendering, revision tracking |
| Inspection Request    | 🔮 Future | Date extraction, follow-up |
| Daily Report          | 🔮 Future | Date-range search, weather extraction |
| Site Photo            | 🔮 Future | EXIF metadata, OCR on images |
| Survey File           | 🔮 Future | Coordinate extraction |
| AutoCAD (DWG/DXF)     | 🔮 Future | Layer extraction, block recognition |
| BIM (IFC)             | 🔮 Future | Element extraction, quantity takeoff |
| Topcon/Trimble Data   | 🔮 Future | Point cloud handling |

### BOQ-Aware Chunking

BOQ items have specific structure: `itemCode` + `description` + `unit` + `quantity` + `rate`.
The BOQ-aware chunker:

1. Detects BOQ format in parsed text (headers like "Item", "Description", "Unit", "Qty", "Rate")
2. Splits at each line item boundary
3. Extracts `boqItemCode` from first column
4. Preserves the item as a single chunk (even if it exceeds default chunk size)
5. Tags metadata with `documentType: 'boq'` and `boqItemCode: '02.01.03'`

### Contract Clause Extraction

Contracts follow a clause hierarchy: `Clause 7 → 7.1 → 7.1.1`
The heading-aware chunker:

1. Detects clause numbering patterns (`\d+(\.\d+)*`)
2. Maintains the clause hierarchy in chunk metadata
3. Preserves clause context (parent clause text included in overlap)
4. Tags metadata with `section: 'Clause 7.2'`

---

## 17. Performance & Scaling

### Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Max documents | 100,000+ | Soft-deleted included |
| Max chunks | 5,000,000+ | ~50 chunks/doc average |
| Upload → indexed | < 30s for 50-page PDF | Async background job |
| Semantic search P95 | < 500ms | With pgvector HNSW index |
| Hybrid search P95 | < 800ms | Merge + RRF overhead |
| Concurrent uploads | 50+ | Queue-based |
| Concurrent searches | 200+ | Read-replica friendly |

### Architecture Decisions for Scale

**1. Background Indexing Queue**

```
Upload → Prisma save (status: pending) → Queue → Worker processes:
                                                      │
                                                 [Chunk → Embed → Store]
```

- Uses a database-backed queue (`IndexQueueService`)
- Workers process one document at a time
- Failed jobs are retried 3x, then marked `embeddingStatus: 'failed'`
- Can be scaled horizontally (multiple workers on different instances)

**2. Incremental Indexing**

When a new version of a document is uploaded:
- Only index the new chunks (not the entire corpus)
- Old chunks remain in the vector store (with status metadata)
- Search can exclude old versions via metadata filter

**3. Cache Layer**

```typescript
interface CacheStrategy {
  // Cache frequently searched embeddings (reuse query vectors)
  queryVectorCache: TTL<5min>;
  
  // Cache search results for identical queries
  searchResultCache: TTL<1min>;
  
  // Cache document metadata
  documentMetadataCache: TTL<5min>;
  
  // Cache parser instances (heavy initialization)
  parserInstanceCache: TTL<30min>;
}
```

**4. Streaming Retrieval (Future)**

For very large result sets, results can be streamed via SSE:

```
Search request → SSE stream → First result in 100ms → Remaining in background
```

**5. Read Replicas**

- Vector store writes → primary
- Vector store reads → replicas (if using pgvector)
- Prisma reads → replicas, writes → primary

**6. Chunk Batching**

- Embedding is the bottleneck: `embedMany(texts)` over `embed(text)` per chunk
- Batch size: 100 chunks per API call (for OpenAI/Ollama)
- In-memory store: bulk insert rather than individual upserts

---

## 18. Observability

### Metrics Tracked

```typescript
interface KnowledgeAnalytics {
  // Upload pipeline
  uploadCount: Counter;
  uploadSizeBytes: Histogram;
  parseTimeMs: Histogram;      // Per parser type
  chunkTimeMs: Histogram;
  embedTimeMs: Histogram;      // Per provider
  indexTimeMs: Histogram;      // Total pipeline time
  indexSuccessCount: Counter;
  indexFailureCount: Counter;
  
  // Storage
  totalDocuments: Gauge;
  totalChunks: Gauge;
  vectorStoreSize: Gauge;      // Estimated memory / disk usage
  
  // Search
  searchCount: Counter;
  searchLatencyMs: Histogram;  // P50, P95, P99
  searchResultCount: Histogram;
  searchStrategy: Counter;     // semantic vs keyword vs hybrid
  searchFilterCount: Counter;
  
  // Citations
  mostCitedDocuments: TopK<string>;  // Top 10 most cited docs
  citationConfidence: Histogram;
  
  // Providers
  embeddingTokenUsage: Counter;      // Per provider
  embeddingProviderUsage: Counter;   // Which provider used
  vectorStoreLatency: Histogram;     // Per store type
  
  // Errors
  parseErrorCount: Counter;          // Per parser type
  embedErrorCount: Counter;          // Per provider
  searchErrorCount: Counter;
}
```

### Storage

Metrics are stored:
- In-memory (via `KnowledgeAnalyticsService`, similar to `AgentAnalyticsService`)
- Exposed via `GET /api/v1/knowledge/analytics`
- Optional: Prometheus export via `@willsoto/nestjs-prometheus`

### Admin Analytics Endpoint

```typescript
// GET /api/v1/knowledge/analytics
interface AnalyticsResponse {
  summary: {
    totalDocuments: number;
    totalChunks: number;
    totalIndexed: number;
    totalFailed: number;
    totalSearches: number;
    avgSearchLatency: number;
    topDocumentTypes: { type: string; count: number }[];
    topProviders: { provider: string; usage: number }[];
  };
  recentSearches: {
    query: string;
    latency: number;
    results: number;
    timestamp: Date;
  }[];
  recentUploads: {
    fileName: string;
    status: string;
    duration: number;
    timestamp: Date;
  }[];
}
```

---

## 19. Future Roadmap

### Phase A — Knowledge Foundation (Now)

- ✅ Prisma schema + migration
- ✅ Document upload + parsing (PDF, DOCX, XLSX, TXT, MD, CSV)
- ✅ Fixed + Recursive + Heading-Aware chunking
- ✅ TF-IDF embedding (dev)
- ✅ In-memory vector store (dev)
- ✅ Hybrid search (semantic + keyword + metadata)
- ✅ Source citation engine
- ✅ AI Agent integration (`search_knowledge` tool)
- ✅ Knowledge Fusion (ERP + documents)
- ✅ Admin UI (list, upload, search, delete)
- ✅ RBAC integration
- ✅ Analytics

### Phase B — Production Embedding (Next)

- 🔲 OpenAI embedding provider
- 🔲 pgvector support
- 🔲 Async indexing queue (proper job worker)
- 🔲 BM25 keyword search (vs simple TF-IDF)
- 🔲 Document-level RBAC
- 🔲 Version history UI

### Phase C — Production Vector Store (Next)

- 🔲 Qdrant / Pinecone provider
- 🔲 Cache layer
- 🔲 Streaming retrieval
- 🔲 Embedding token usage tracking
- 🔲 Performance benchmarks at 10K/100K documents

### Phase D — Construction Intelligence (Future)

- 🔲 BOQ-aware chunking enhancement
- 🔲 Contract clause extraction + obligation tracking
- 🔲 Drawing metadata (DWG header extraction)
- 🔲 BIM/IFC parser
- 🔲 Site photo OCR
- 🔲 Daily report analytics

### Phase E — Advanced Features (Future)

- 🔲 Multi-modal search (text + images)
- 🔲 Cross-lingual search (query in English, find Arabic docs)
- 🔲 Document Q&A with follow-up
- 🔲 Automatic document classification
- 🔲 Document comparison engine
- 🔲 PDF rendering in browser
- 🔲 Drag-and-drop folder upload
- 🔲 Webhook on index complete

---

## 20. Appendix: Interfaces

### Complete Interface Definitions

```typescript
// ==========================================
// Domain Interfaces
// ==========================================

// ---- Embedding Provider ----
interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  
  embed(text: string): Promise<number[]>;
  embedMany(texts: string[]): Promise<number[][]>;
}

// ---- Vector Store ----
interface StoredChunk {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  content: string;
}

interface SearchQuery {
  vector: number[];
  keyword?: string;
  filter?: Record<string, any>;
  limit?: number;
  minScore?: number;
}

interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, any>;
  source: 'semantic' | 'keyword' | 'hybrid';
}

interface VectorStore {
  readonly name: string;
  
  upsert(chunks: StoredChunk[]): Promise<void>;
  delete(ids: string[]): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult[]>;
  count(filter?: Record<string, any>): Promise<number>;
  rebuildIndex(): Promise<void>;
  clear(): Promise<void>;
  health(): Promise<{ documentCount: number; chunkCount: number; provider: string; status: string }>;
}

// ---- Document Parser ----
interface ParserInput {
  filePath: string;
  fileType: string;
  fileName: string;
  encoding?: string;
}

interface ParsedDocument {
  content: string;
  metadata: Record<string, any>;
  structure?: { type: string; level?: number; content: string; pageNumber?: number; section?: string }[];
  warnings?: string[];
}

interface DocumentParser {
  readonly supportedTypes: string[];
  readonly displayName: string;
  
  supports(fileType: string): boolean;
  parse(file: ParserInput): Promise<ParsedDocument>;
}

// ---- Chunk Engine ----
interface ChunkConfig {
  strategy?: string;
  chunkSize?: number;
  overlap?: number;
  maxTokens?: number;
  language?: string;
}

interface Chunk {
  content: string;
  chunkIndex: number;
  strategy: string;
  pageNumber?: number;
  section?: string;
  paragraph?: number;
  boqItemCode?: string;
  metadata?: Record<string, any>;
}

interface ChunkStrategy {
  readonly name: string;
  chunk(text: string, config: ChunkConfig): Promise<Chunk[]>;
}

// ---- Search ----
interface SearchDocumentsQuery {
  query: string;
  projectId?: string | string[];
  buildingId?: string | string[];
  department?: string | string[];
  category?: string | string[];
  documentType?: string | string[];
  tags?: string[];
  language?: string;
  status?: string;
  limit?: number;
  minScore?: number;
  strategy?: 'hybrid' | 'semantic' | 'keyword';
}

interface SearchResultItem {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  source: string;
  document: {
    id: string;
    title: string;
    fileName: string;
    fileType: string;
    version: number;
    status: string;
  };
  location: {
    pageNumber?: number;
    section?: string;
    paragraph?: number;
  };
  metadata: Record<string, any>;
}

// ---- Citation ----
interface SourceCitation {
  documentId: string;
  documentTitle: string;
  documentFileName: string;
  fileType: string;
  version: number;
  pageNumber?: number;
  section?: string;
  paragraph?: number;
  confidence: number;
  excerpt: string;
}
```

---

*End of Architecture Document v1.0.0*

This document covers all 12 required architecture areas and meets the 14 deliverables specified. Ready for review and approval before implementation begins.
