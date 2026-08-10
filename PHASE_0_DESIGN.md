# VEXA — MASTER DESIGN SPECIFICATION (PHASE 0)
## Web Platform — $0 MVP Architecture & Execution Planning

---

## A. PRODUCT REQUIREMENTS DOCUMENT (PRD)

### 1. Purpose & Scope
VEXA is an autonomous, cloud-based agent platform for content intelligence and production. VEXA operates as a continuous, closed-loop system that researches market opportunities, makes strategic decisions, plans and scripts content, runs multi-stage quality control, compiles production assets, renders videos, publishes them, and analyzes performance metrics to update its own core strategy.

**Strict Scope Constraint**: This specification is strictly for the **Web Platform (Web Dashboard / Control Plane, Cloud Backend, and Agent Brain)**.
* **OUT OF SCOPE**: Android applications, mobile keyboard dependencies, mobile-specific protocols, and raw publishing/video generation integrations in the early phases.
* **PORTABILITY FIRST**: Everything must sit behind abstract interfaces to prevent vendor lock-in.

### 2. Autonomous Loop vs. Chatbot Paradigm
Unlike a traditional chatbot (which takes a user prompt, queries an LLM, and outputs an answer), VEXA is designed as an autonomous agent system. It operates on an endless execution loop:

```
    +--------------------------------------------------------+
    |                                                        |
    v                                                        |
+-------------+      +-------------+      +-------------+    |
|  RESEARCH   | ---> |   ANALYZE   | ---> | UPDATE MEM  |    |
+-------------+      +-------------+      +-------------+    |
                                                 |           |
                                                 v           |
+-------------+      +-------------+      +-------------+    |
|    LEARN    | <--- |   PUBLISH   | <--- |   DECIDE    | ---+ (Wait / Do Nothing)
+-------------+      +-------------+      +-------------+    |
       ^                                         |           |
       |                                         v           |
+-------------+                           +-------------+    |
|   ANALYZE   | <------------------------ |   PRODUCE   | <---+
|   RESULTS   |                           +-------------+
+-------------+                                  |
                                                 v
                                          +-------------+
                                          |   QC GATES  |
                                          +-------------+
```

The Agent Brain can choose any of the following output states:
1. `PRODUCE`: Initiate content pipeline.
2. `RESEARCH_MORE`: Expand search scope, gather more dataset signals.
3. `DO_NOTHING`: Sleep or wait for channel/topic signals to shift. This is a first-class, valid decision.
4. `REVISE_STRATEGY`: Analyze negative performance signals or failures and update strategy parameters.
5. `PAUSE_FOR_HUMAN`: Halt execution and trigger human operator review via the Web Dashboard.

---

## B. SYSTEM ARCHITECTURE

VEXA enforces a strict boundary between the **Control Plane** (visualization, monitoring, user approvals, configuration) and the **Execution Plane** (agent operations, state storage, job orchestration, and background worker queues).

```
+----------------------------------------------------------------------------------+
|                                  CONTROL PLANE                                   |
|                                                                                  |
|   +------------------------------------+                                         |
|   |          WEB DASHBOARD             |                                         |
|   |  - React + TypeScript SPA          |                                         |
|   |  - Tailwind Dark-Theme             |                                         |
|   |  - State Visualization (Recharts)   |                                         |
|   +------------------------------------+                                         |
+-----------------------------------------|----------------------------------------+
                                          | HTTPS / WebSocket (SSE)
                                          v (Authenticated/Authorized Gateway)
+----------------------------------------------------------------------------------+
|                                 EXECUTION PLANE                                  |
|                                                                                  |
|   +--------------------------------------------------------------------------+   |
|   |                              CLOUD BACKEND                               |   |
|   |                                                                          |   |
|   |   +----------------------+    +-------------------+    +-------------+   |   |
|   |   |      API GATEWAY     |    | ORCHESTRATION ENG |    | AGENT BRAIN |   |   |
|   |   |  - Express Router    |    | - Job Lifecycle   |    | - Logic     |   |   |
|   |   |  - Auth Middleware   |    | - State Machine   |    | - Decider   |   |   |
|   |   +----------------------+    +-------------------+    +-------------+   |   |
|   |              |                          |                     |          |   |
|   |              | Writes Job               v Reads Memory        v          |   |
|   |              v                          +---------------> [Memory]       |   |
|   |      +-----------------+                                                 |   |
|   |      |   JOB SYSTEM    | <====== Durable Jobs ======> [Database]         |   |
|   |      |  - BullMQ/Redis |                              - PostgreSQL       |   |
|   |      +-----------------+                              - Prisma ORM       |   |
|   +--------------|-----------------------------------------------------------+   |
|                  |                                                               |
|                  v Polls Jobs                                                    |
|   +------------------------------------+                                         |
|   |          WORKER POOL               |                                         |
|   |  - Research Engine Workers         |                                         |
|   |  - Script & Asset Generators       |                                         |
|   |  - QC Verification Agents          |                                         |
|   |  - FFmpeg Composition Engines      |                                         |
|   +------------------------------------+                                         |
|                  |                                                               |
|                  v Invokes (via Interfaces)                                      |
|   +--------------------------------------------------------------------------+   |
|   |                         EXTERNAL PROVIDER LAYER                          |   |
|   |  [IAIProvider]   [IResearchProvider]   [IPublishingProvider]   ...       |   |
|   +--------------------------------------------------------------------------+   |
+----------------------------------------------------------------------------------+
```

### Architectural Safeguards
1. **No Backend Secrets in Control Plane**: The frontend application operates with zero environment-level API keys (other than client auth endpoints).
2. **Provider Isolation**: All third-party SDK calls (OpenAI, Gemini, YouTube APIs, etc.) are encapsulated in adapters implementing strict interfaces.
3. **Transactional Integrity**: All job queue movements and memory adjustments must utilize transactional database updates to prevent drift.

---

## C. FRONTEND ARCHITECTURE (WEB DASHBOARD)

The VEXA frontend acts purely as a terminal for monitoring the brain, inspecting memory, altering threshold weights, reviewing QC logs, and manually authorizing jobs.

### 1. Technology Stack
* **Framework**: React 18+ with TypeScript (strict typing configuration).
* **Build System**: Vite (high performance, rapid hot reload).
* **Styling**: Tailwind CSS with a Dark-First, high information-density color system.
* **Charts**: Recharts or Chart.js for data visualization (CTR, Views, retention curves).
* **State Management**: Zustand (lightweight, decoupled from component rendering lifecycle) or React Query (for synchronized backend state caching).
* **Real-time Engine**: SSE (Server-Sent Events) or WebSocket clients to stream live Worker execution logs and job queue states.

### 2. Layout Structure
* **Dashboard / Status Hub**: Real-time ticker of the Brain’s active thinking process, currently running jobs, and current operational queue metrics.
* **Memory Inspector**: Hierarchical browse views for Channel, Topic, Content, Audience, Performance, Strategy, Failure, and Experiment memories. Includes search, filters, and relationship links.
* **Content Pipeline Kanban**: Visualizes script drafts, scene plans, generated voiceovers, subtitles, and finished render tasks with active manual approval buttons.
* **Decision Audit Log**: Comprehensive, filterable table displaying every `DecisionRecord` produced by the Brain.
* **System Settings & Threshold Weights**: Sliding scale UI to configure active agent decision thresholds (e.g., minimum confidence score required to auto-produce).

---

## D. BACKEND ARCHITECTURE

The cloud backend is designed as a **modular monolith** in Node.js with TypeScript. This limits initial deployment costs to $0, minimizes internal networking overhead, and allows clean logical refactoring to microservices if scaled.

### 1. Technology Stack
* **Runtime**: Node.js v20+ (LTS).
* **Framework**: Fastify or Express (Fastify is preferred for low-latency JSON serialization and built-in schema validation).
* **Language**: TypeScript (with paths mapped to distinct domains).
* **Job Core**: BullMQ (Redis-based) or a highly customized database transactional queue (Prisma + PostgreSQL) to hit strict $0 MVP operational goals without Upstash limits.
* **Database Driver**: Prisma Client (Type-safe query engine) or Kysely for type-safe SQL query generation.

### 2. Core Domains (Modules)
* **`api/`**: REST endpoints for the Dashboard UI, authenticating users, pulling memory states, and submitting human approvals.
* **`brain/`**: The Core Decision Loop, containing strategy parsing, context gathering, prompt crafting, and decision record compilation.
* **`jobs/`**: Queue orchestrators, parent-child job definitions, queue workers, and retry handlers.
* **`memory/`**: Repository layer managing read/write interfaces to the PostgreSQL schema and optional vector stores.
* **`qc/`**: Isolated Quality Control pipeline executing sequential rules (Safety, Rules, Technical constraints) on content inputs.
* **`providers/`**: Implementations of external interface adapters.

---

## E. DATABASE DESIGN

The relational database is the single source of truth for execution state, system history, and system configurations. PostgreSQL is configured using standard relational keys and index-optimized tables.

```
       +--------------------+
       |       Users        |
       +--------------------+
                 | 1
                 |
                 | N
       +--------------------+
       |      Channels      |
       +--------------------+
                 | 1
                 |---------------------------------------------+
                 | N                                           | N
       +--------------------+                        +--------------------+
       |  DecisionRecords   |                        |   StrategyVersion  |
       +--------------------+                        +--------------------+
                 | 1                                           | 1
                 |                                             |
                 | N                                           | N
       +--------------------+                        +--------------------+
       |    MemoryEntries   | <---+                  |     Experiments    |
       |  (Polymorphic Rel) |     |                  +--------------------+
       +--------------------+     |
                 | 1              |
                 |                | N
                 | N              |
       +--------------------+     |
       |        Jobs        | ----+
       +--------------------+
                 | 1
                 |
                 | N
       +--------------------+
       |     QCResults      |
       +--------------------+
```

### Prisma Schema Blueprint (Core Models)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-type-safe"
}

enum JobStatus {
  QUEUED
  RUNNING
  WAITING_APPROVAL
  PAUSED
  COMPLETED
  FAILED
  RETRYING
  DEAD_LETTER
}

enum DecisionOutcome {
  PRODUCE
  RESEARCH_MORE
  DO_NOTHING
  REVISE_STRATEGY
  PAUSE_FOR_HUMAN
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  channels     Channel[]
}

model Channel {
  id              String            @id @default(uuid())
  userId          String
  user            User              @relation(fields: [userId], references: [id])
  platform        String            // "YOUTUBE", "TIKTOK", etc.
  platformId      String
  name            String
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  decisions       DecisionRecord[]
  memories        MemoryEntry[]
  strategies      StrategyVersion[]
}

model DecisionRecord {
  id                  String          @id @default(uuid())
  channelId           String
  channel             Channel         @relation(fields: [channelId], references: [id])
  decision            DecisionOutcome
  timestamp           DateTime        @default(now())
  context             Json            // Active factors and sensory inputs
  evidence            Json            // Key data points triggering decision
  confidenceScore     Float
  alternatives        Json            // Alternative pathways evaluated
  rejectionReasons    String[]
  expectedOutcome     String?
  predictedMetrics    Json?
  strategyVersionId   String
  strategyVersion     StrategyVersion @relation(fields: [strategyVersionId], references: [id])
  actualOutcome       String?
  correlationId       String          @unique @default(uuid())
  jobs                Job[]
}

model MemoryEntry {
  id         String   @id @default(uuid())
  channelId  String
  channel    Channel  @relation(fields: [channelId], references: [id])
  category   String   // "CHANNEL", "TOPIC", "CONTENT", "AUDIENCE", "PERFORMANCE", "STRATEGY", "FAILURE", "EXPERIMENT"
  key        String   @unique
  version    Int      @default(1)
  data       Json     // Arbitrary category payload
  vector     Unsupported("vector")? // Reserved for pgvector usage
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  jobs       Job[]    // Related job connection
}

model Job {
  id             String         @id @default(uuid())
  parentJobId    String?
  parentJob      Job?           @relation("JobHierarchy", fields: [parentJobId], references: [id])
  childJobs      Job[]          @relation("JobHierarchy")
  decisionId     String?
  decision       DecisionRecord? @relation(fields: [decisionId], references: [id])
  memoryEntryId  String?
  memoryEntry    MemoryEntry?   @relation(fields: [memoryEntryId], references: [id])
  correlationId  String
  status         JobStatus      @default(QUEUED)
  priority       Int            @default(0)
  payload        Json
  result         Json?
  retryCount     Int            @default(0)
  maxRetries     Int            @default(3)
  leaseExpiry    DateTime?
  heartbeatAt    DateTime?
  idempotencyKey String         @unique
  errorMessage   String?
  errorStack     String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  qcResults      QCResult[]

  @@index([status])
  @@index([parentJobId])
}

model QCResult {
  id          String   @id @default(uuid())
  jobId       String
  job         Job      @relation(fields: [jobId], references: [id])
  gateName    String   // "FACTUAL", "SAFETY", "COPYRIGHT", "TECHNICAL", etc.
  passed      Boolean
  score       Float
  details     Json     // Discovered errors, risk markers
  checkedAt   DateTime @default(now())
}

model StrategyVersion {
  id          String           @id @default(uuid())
  channelId   String
  channel     Channel          @relation(fields: [channelId], references: [id])
  version     Int
  rules       Json             // Object mapping goals to strict parameters
  thresholds  Json             // Threshold values for triggering pipeline
  isActive    Boolean          @default(false)
  createdAt   DateTime         @default(now())
  decisions   DecisionRecord[]
  experiments Experiment[]
}

model Experiment {
  id                String          @id @default(uuid())
  strategyVersionId String
  strategyVersion   StrategyVersion @relation(fields: [strategyVersionId], references: [id])
  name              String
  hypothesis        String
  variables         Json
  expectedResult    String
  actualResult      String?
  isCompleted       Boolean         @default(false)
  createdAt         DateTime        @default(now())
  completedAt       DateTime?
}
```

---

## F. MEMORY MODEL

VEXA segments its knowledge base into eight highly structured and isolated memory subsystems. Overwriting values silently is strictly forbidden; updates must append or write to indexed versioned rows.

### 1. CHANNEL MEMORY
* **Contents**: Rules, platform handles, audience target profiles, prohibited semantic guidelines, content formatting definitions.
* **Retention/Versioning**: Long-lived config-as-memory. Changes trigger automated validation scripts.

### 2. TOPIC MEMORY
* **Contents**: Market trends, search volume tracking, historical competitive performance metrics, topic lifecycle indices (Viral, Steady, Declining), momentum trends.
* **Retention/Versioning**: Continuous append logs. Older observations are periodically condensed into summarized trends using AI context compilation.

### 3. CONTENT MEMORY
* **Contents**: Previously compiled scripts, exact timelines, visual/audio assets used, prompt definitions, structural outline histories, publication details.
* **Retention/Versioning**: Permanent history. Crucial for ensuring duplicate content check loops prevent self-plagiarism.

### 4. AUDIENCE MEMORY
* **Contents**: Aggregated comment sentiment charts, viewer pattern tracking, demographic maps, historical feedback signals.
* **Retention/Versioning**: Weekly aggregation logs. No storage of individual PII (Personally Identifiable Information).

### 5. PERFORMANCE MEMORY
* **Contents**: CTR (Click-Through Rate), Impressions, Average View Duration (AVD), retention graphs, subscriber conversion indicators.
* **Retention/Versioning**: Permanent numerical matrices keyed by content ID, structured specifically for ingestion by strategy recalculation loops.

### 6. STRATEGY MEMORY
* **Contents**: High-level rules, logic thresholds (e.g., minimum CTR threshold to trigger identical content loops), hypotheses, heuristics.
* **Retention/Versioning**: Hard versions. Under no circumstance are strategies overwritten. The current strategy version ID is embedded in every single generated content run's database record.

### 7. FAILURE MEMORY
* **Contents**: Job failure context dumps, system crashes, API provider errors, QC gate failure triggers, diagnostic findings.
* **Retention/Versioning**: Self-analyzing debug memory. Used by the worker error feedback systems to adjust retry parameters or avoid failing content themes.

### 8. EXPERIMENT MEMORY
* **Contents**: Hypothesis definitions, operational variables (e.g., testing short form vs long form structures), expectation maps, final outcomes.
* **Retention/Versioning**: Retained forever to prevent repeating redundant or failed experiments.

---

## G. JOB & QUEUE MODEL

The engine operates via a durable, parent-child task execution pattern. BullMQ is preferred, but to facilitate a true $0 infrastructure platform initially, we design a **Transactional PostgreSQL Job Queue Pattern** that utilizes PostgreSQL atomic rows (`SELECT ... FOR UPDATE SKIP LOCKED`).

```
ProduceVideoJob (Parent)
 ├── ContentStrategyJob (Child 1)
 ├── ScriptJob (Child 2)
 ├── ScriptQCJob (Child 3)
 ├── ScenePlanningJob (Child 4)
 ├── AssetJob (Child 5)
 ├── VoiceJob (Child 6)
 ├── SubtitleJob (Child 7)
 ├── RenderJob (Child 8)
 ├── VideoQCJob (Child 9)
 ├── MetadataJob (Child 10)
 └── PublishingJob (Child 11)
```

### Job Management & Lifecycle

1. **Job Creation**: Jobs are spawned atomically within a DB Transaction.
2. **Polling / Lease**: Workers execute a transactional state shift:
   ```sql
   UPDATE "Job"
   SET status = 'RUNNING', "leaseExpiry" = NOW() + INTERVAL '5 minutes', "updatedAt" = NOW()
   WHERE id = (
     SELECT id FROM "Job"
     WHERE status = 'QUEUED' AND ("parentJobId" IS NULL OR "parentJobId" IN (SELECT id FROM "Job" WHERE status = 'COMPLETED'))
     ORDER BY priority DESC, "createdAt" ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED
   )
   RETURNING *;
   ```
3. **Heartbeat / Renewal**: Every worker running a job must execute an active update query every 30 seconds to push `leaseExpiry` forward. If the heartbeat expires, the Orchestrator marks the job as `RETRYING` or `DEAD_LETTER` and releases it.
4. **Idempotency Safeguard**: Every job requires a deterministic `idempotencyKey` derived from the unique `correlationId` and step identifier. A duplicate job request with an existing `idempotencyKey` instantly returns the existing record.

---

## H. PROVIDER INTERFACES

The codebase depends strictly on decoupled abstract interfaces. Concrete provider classes are initialized via Dependency Injection.

### 1. `IAIProvider`
```typescript
export interface IAIProvider {
  generateText(prompt: string, options?: { systemInstruction?: string; temperature?: number; responseJson?: boolean }): Promise<string>;
  generateEmbeddings(text: string): Promise<number[]>;
  getProviderName(): string;
}
```

### 2. `IResearchProvider`
```typescript
export interface MarketSignal {
  topic: string;
  searchVolume: number;
  competitionIndex: number; // 0 to 1
  momentumScore: number;    // -1 to 1
  rawPayload: any;
}

export interface IResearchProvider {
  fetchTrendingTopics(niche: string): Promise<MarketSignal[]>;
  searchMarketSignals(query: string): Promise<MarketSignal[]>;
}
```

### 3. `IPublishingProvider`
```typescript
export interface PublicationDetails {
  platformVideoId: string;
  publishUrl: string;
  metadata: any;
}

export interface IPublishingProvider {
  publishVideo(videoPath: string, title: string, description: string, tags: string[]): Promise<PublicationDetails>;
}
```

### 4. `IVideoGenerationProvider`
```typescript
export interface CompositionTimeline {
  durationSeconds: number;
  layers: Array<{
    type: 'video' | 'image' | 'text' | 'audio';
    sourceUrl: string;
    start: number;
    end: number;
    position?: { x: number; y: number; width: number; height: number };
  }>;
}

export interface IVideoGenerationProvider {
  renderVideo(timeline: CompositionTimeline, outputPath: string): Promise<{ success: boolean; outputUrl: string }>;
}
```

---

## I. AGENT BRAIN DESIGN

The Brain is a state-driven loop orchestrated by the `BrainDecider` module.

```
       +---------------------------------------------+
       |             BRAIN EXECUTION LOOP            |
       +---------------------------------------------+
                              |
                              v
                 [GATHER CONTEXT & EVIDENCE]
        - Reads Active Channel Rules from Channel Memory
        - Extracts High-Momentum Signals from Topic Memory
        - Grabs Recent Performance Matrices & Failure Reports
                              |
                              v
                   [EVALUATE HYPOTHESES]
        - Pulls Active Strategy Version parameters
        - Applies logic thresholds (e.g., Confidence limit)
                              |
                              v
                  [GENERATE DECISION RECORD]
        - Formulates prompt for IAIProvider
        - Parses options: PRODUCE, RESEARCH_MORE, DO_NOTHING,
          REVISE_STRATEGY, PAUSE_FOR_HUMAN
                              |
                              v
                 [PERSIST & DISPATCH RECORD]
        - Saves to DB under "DecisionRecord"
        - Spawns child execution jobs if outcome is PRODUCE
```

### Context Formatting Schema
The context supplied to the Brain decider is structured rigidly as a JSON block:
```json
{
  "current_time": "2023-11-20T12:00:00Z",
  "channel_id": "chan_v1_001",
  "strategy_version": 4,
  "thresholds": {
    "min_trend_score": 0.75,
    "max_qc_failures_before_halt": 2
  },
  "market_signals": [
    { "topic": "AI agents", "score": 0.88, "evidence": "Trending search volume" }
  ],
  "recent_failures": [],
  "history": {
    "last_decision": "DO_NOTHING",
    "last_decision_timestamp": "2023-11-20T06:00:00Z"
  }
}
```

---

## J. SECURITY MODEL

1. **Absolute Secret Separation**: No API keys or OAuth refresh tokens are stored in configuration files or code assets. They must reside in securely mounted system environment variables.
2. **Access Control**: Role-Based Access Control (RBAC) blocks unauthorized users from manually bypassing QC gates or updating strategy files on the Web Dashboard.
3. **Database Security**: Sensitives (e.g., publishing access tokens) stored inside PostgreSQL are encrypted at-rest using AES-256-GCM.
4. **Log Masking**: Output logger engines include pattern regexes to scrub strings matching typical credential architectures (Bearer tokens, SSH keys, private keys, authorization payloads, or passwords).
5. **CORS and Security Headers**: Strict CORS setup on the API server ensures only verified Dashboard origins are allowed to issue commands.

---

## K. $0 MVP INFRASTRUCTURE PLAN

To build VEXA safely at $0 hosting costs during initial development, we structure a cloud architecture using completely free-tier developer services.

```
+---------------------------------------------------------------------------------+
|                                 $0 MVP CLOUD                                    |
|                                                                                 |
|   [Cloudflare Pages] (Free Frontend Hosting)                                    |
|         |                                                                       |
|         v (REST APIs / Server-Sent Events)                                      |
|   [Render / Koyeb] (Free Web & Worker Tiers)                                    |
|         |                                                                       |
|         +-------------------------+                                             |
|         |                         |                                             |
|         v                         v                                             |
|   [Supabase / Neon]        [Supabase Storage]                                   |
|   (Free Postgres Server)   (10GB Free Storage)                                  |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

1. **Frontend Hosting**: Cloudflare Pages / Vercel (unlimited bandwidth on free tier, global edge network, HTTPS certificates included out of the box).
2. **Database Engine**: Neon / Supabase PostgreSQL Free Tier (provides a full PostgreSQL instance with pgvector support, 500MB storage limit, and connection pooling).
3. **Web Server & Workers**: Render / Koyeb (Koyeb offers high performance, SSD, and web app free tiers. Render offers standard Node.js runtime free tiers with automatic git-triggered deploys).
4. **Queue Storage**: Since external Upstash Redis free tiers have a low limit of 10,000 API calls per day, VEXA will use **Transactional PostgreSQL Queue Tables** (using Prisma/Kysely with `FOR UPDATE SKIP LOCKED`). This ensures $0 cost with zero physical request count limitations.
5. **Asset Storage**: Supabase Storage / Cloudflare R2 (R2 offers 10GB free tier storage with $0 egress fees, which is ideal for rendering video assets).

---

## L. FREE-TIER DEPENDENCY ANALYSIS

| Dependency | Classification | Limit details / Cost implications | Mitigations / Mock Strategy |
| :--- | :--- | :--- | :--- |
| **Google Gemini API** | LIMITED FREE | Free tier allows 15 RPM (Requests Per Minute) on flash models. | Fallback to mock interface wrapper when limit breached. |
| **OpenAI API** | REQUIRES PAYMENT | Pay-per-token structure. No true free tier. | *MUST MOCK* during development. Enable live calls only inside specific integration test cases. |
| **Neon Postgres** | LIMITED FREE | 0.5 GiB of storage, 1 active project, automatic scale-to-zero. | Strict cleanup cron jobs running inside the database to prune old logs and execution payloads. |
| **Cloudflare R2** | LIMITED FREE | 10 GB storage per month, 1M Class A operations, 10M Class B. | Aggressive object lifecycle policies to automatically clean up raw generated video frames after 48 hours. |
| **YouTube API** | LIMITED FREE | 10,000 units/day quota default. | Implemented as mock adapters with local file mocks for development; real calls reserved for verified builds. |

---

## M. DEVELOPMENT ROADMAP

```
                    +-----------------------------+
                    |           PHASE 0           |
                    |   Architecture & Planning   |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |           PHASE 1           |
                    |     Foundation & Database   |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |           PHASE 2           |
                    |    Orchestration & Queue    |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |           PHASE 3           |
                    |    Memory & State Engine    |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |           PHASE 4           |
                    |   Research & Signal Loop    |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |           PHASE 5           |
                    |   Content & Script Pipeline |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |           PHASE 6           |
                    |    Independent QC Engine    |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |           PHASE 7           |
                    |    Control Plane Dashboard  |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |           PHASE 8           |
                    |    Video Production MVP     |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |           PHASE 9           |
                    |     Analytics & Learning    |
                    +-----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |           PHASE 10          |
                    |  Real API & Prod Hardening  |
                    +-----------------------------+
```

---

## N. PHASE BREAKDOWN

### Phase 1: Foundation & Database
* **Scope**: Repository initialization, linting, formatting rules, local Docker Postgres compose, Prisma initialization, secure config loader, token-based Auth structure.
* **Deliverables**: Operational Node.js server, verified database schemas, migrations script, local setup script, basic API endpoints for sign up/sign in.

### Phase 2: Orchestration & Queue
* **Scope**: Transactional queue worker architecture, job definitions, heartbeat systems, lock monitors, failure monitors.
* **Deliverables**: Codebase module `jobs/` containing base classes, tests showcasing child jobs completing after parent jobs, worker failover verification suites.

### Phase 3: Memory & State Engine
* **Scope**: Implementation of the eight database-driven memory domains, serialization/deserialization logic, versioning structures.
* **Deliverables**: DB repository modules containing clean transaction interfaces for checking, updating, and rolling back memory segments.

### Phase 4: Research & Signal Loop
* **Scope**: Creation of continuous research agent framework. Mock implementations of trending searches, competitive scanning, and niche profiling.
* **Deliverables**: Intelligence update cron tasks, DB Topic updates, automated Brain signal notifications.

### Phase 5: Content & Script Pipeline
* **Scope**: Structured Content Generator code using `IAIProvider` integrations. Prompts to outline, write scenes, assemble metadata, and generate script JSONs.
* **Deliverables**: Script execution worker, mock AI models, structured script schema parsers.

### Phase 6: Independent QC Engine
* **Scope**: Development of modular validation layers (Factual verification, Security verification, Technical formatting checks, copyright risk evaluation).
* **Deliverables**: Verification module processing pipeline scripts and writing strict metadata scores to the DB.

### Phase 7: Control Plane Dashboard
* **Scope**: React application scaffolding, Tailwind config, page layouts, live event sockets, approval panel components.
* **Deliverables**: Operational dashboard pulling metrics from the running server backend, showing jobs completing in real time.

### Phase 8: Video Production MVP
* **Scope**: Assembly pipeline utilizing FFmpeg and Remotion configurations. Synthesis of audio clips, image backdrops, text layers, and timeline configurations.
* **Deliverables**: Dedicated worker running local render commands generating local video assets.

### Phase 9: Analytics & Learning
* **Scope**: Metrics aggregation pipelines, feedback analyzers comparing predicted vs actual engagement vectors, automated strategy modifications.
* **Deliverables**: Post-run analytics ingestion, system testing demonstrating the system auto-changing threshold values based on negative signals.

### Phase 10: Real API & Prod Hardening
* **Scope**: Releasing interface mocks for active providers (OpenAI, Gemini, YouTube API). Live integration runs, stress runs, network recovery verification.
* **Deliverables**: Production-grade platform ready to execute real autonomous channels safely.

---

## O. TESTING STRATEGY

To uphold the core principle of **Reliability & Testability over Speed**, VEXA implements an intensive testing pyramid.

```
       /\
      /  \       End-to-End Tests (Playwright for Dashboard + API flows)
     /----\
    /      \     Integration Tests (API Router, Queue States, DB Transactions)
   /--------\
  /          \   Unit Tests (Vitest; Mock Providers, Math logic, Strategy weight parsers)
 /------------\
```

### 1. Verification of Recovery Lifecycle
Our testing setup must explicitly verify worker recovery scenarios:
1. **The State Run**: Create a `ProduceVideoJob` parent task with multiple child steps.
2. **The Execution**: Start a Worker process and let it mark a child job as `RUNNING`.
3. **The Kill**: Send a hard SIGKILL signal to the running Worker process while processing is active.
4. **The Evaluation**: Start a new Worker process. Confirm that:
   * The active lease expires.
   * The new Worker recovers the orphaned job.
   * The job completes successfully.
   * *Exactly-Once Execution* is verified by inspecting database audit traces.

---

## P. FAILURE & RECOVERY STRATEGY

### Disaster Recovery Scenarios & Mitigations

#### 1. DB Outage / Network Partition
* **Impact**: Workers unable to update job heartbeat or pull queued tasks.
* **Recovery**: Local worker cache holds current step. If database calls fail 3 times sequentially, the worker gracefully pauses execution of current step, dumps in-memory state to a local fallback log file, and enters standby mode until connection is re-established.

#### 2. Worker Crashing Midway through Video Composition
* **Impact**: FFmpeg processes interrupted. Disk space cluttered with raw temp frames.
* **Recovery**: Heartbeat monitoring identifies the lease expiration. The replacement worker cleans up the orphaned temp directory using the unique `correlationId` folder name, before resetting the job status to `QUEUED`.

#### 3. Third-party API Rate Limits / Outages
* **Impact**: LLM generation fails or throws HTTP 429.
* **Recovery**: Standard Exponential Backoff with Jitter:
  $$T_{\text{wait}} = 2^{\text{retryCount}} \times 1000\,\text{ms} + \text{random\_jitter}$$
  If max retries are exceeded, the job transitions to `WAITING_APPROVAL` with `PAUSE_FOR_HUMAN` triggered.

#### 4. Critical Database Leak or Unauthorized Session
* **Impact**: User credentials or platform tokens compromised.
* **Recovery**: Database has active master session-kill script. Frontend invalidates all JSON Web Tokens (JWT) instantly. Secrets manager rotates the root encryption keys.

---

## Q. MIGRATION PATH TO PRODUCTION

VEXA scales cleanly from a $0 local setup to an enterprise-grade cloud architecture:

```
+---------------------------------------------------------------------------------+
|                               DEVELOPMENT ($0)                                  |
|                                                                                 |
|  - Postgres: Neon/Supabase (Free)        - Storage: CF R2 / Supabase Free       |
|  - Queue: PG Transactional Queue        - Workers: Koyeb/Render (Free Tiers)    |
|  - Providers: Mocked AI & APIs           - Domain: Default SSL App Endpoints   |
+---------------------------------------------------------------------------------+
                                       |
                                       v (Scale Migration Triggered)
+---------------------------------------------------------------------------------+
|                               PRODUCTION (Scale)                                |
|                                                                                 |
|  - Postgres: AWS RDS / GCP Cloud SQL    - Storage: Dedicated AWS S3 / IAM       |
|  - Queue: Dedicated Redis Cluster        - Workers: Kubernetes Pods / ECS       |
|  - Providers: Verified API Contracts     - Domain: Custom Private DNS / WAF     |
+---------------------------------------------------------------------------------+
```

1. **Database Migration**: Switch database URL to dedicated instance. Run Prisma migrations. Connection pools are upgraded with PgBouncer or AWS RDS Proxy.
2. **Queue Separation**: Change local transactional PG queues to high-performance Redis Clusters managed by BullMQ. The core worker logic remains untouched as it relies on the internal job queue class abstraction.
3. **Asset Migration**: Swap the mock local directories or Supabase folders with fully secured, IAM-controlled S3 Buckets.
4. **Provider Activation**: Flip environment toggles to enable live API wrappers (`OpenAIProvider`, `YouTubeProvider`, etc.) replacing mock adapters.

---

## R. RISK REGISTER

| Risk Identifier | Likelihood | Impact | Description | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **R-01: API Quota Depletion** | High | Medium | LLM or Video generation APIs run out of funds or hit free quotas during loops. | Strict threshold controls limiting daily volume; mock fallbacks for all dev/staging systems. |
| **R-02: Content Quality Drift** | Medium | High | LLM output drifts into repetitive, lower-tier patterns over multiple cycles. | Multi-agent QC gating requiring diverse prompt strategies for independent evaluators; Human Approval overrides. |
| **R-03: Platform Banning** | Low | High | Social platform flags VEXA automated account as span or violation of policy. | Conservative human-mimicking delay throttles; strict safety and rule filters before publishing. |
| **R-04: DB Storage Limits** | High | Low | Neon/Supabase free tiers hit storage capacity from logs and video timelines. | Automatically sweep and delete historical jobs older than 14 days; save large assets to ephemeral storage. |
| **R-05: Cold Starts / Slow Latency** | Medium | Low | Free cloud host instances scale to zero during inactivity, delaying UI updates.| Implement client-side connection retry displays; keep servers warm using lightweight ping crons. |

---

## S. ACCEPTANCE CRITERIA FOR EACH PHASE

* **Phase 1 (Foundation)**:
  - System compiles with zero TypeScript errors.
  - Test suites execute against local test databases successfully.
  - JWT creation and validation routes output verified payloads.
* **Phase 2 (Orchestration & Queue)**:
  - Jobs can be spawned, leased, and updated safely with active transactions.
  - Worker failure test cases demonstrate 100% recovery rates without duplicate execution.
* **Phase 3 (Memory Engine)**:
  - Memory read, write, and audit queries complete within <50ms.
  - Attempting to overwrite strategy files throws explicit typescript build-time and runtime exceptions.
* **Phase 4 (Research Engine)**:
  - Continuous cron scan processes successfully compile data into Topic memory records without memory leaks.
* **Phase 5 (Script Pipeline)**:
  - Output script payloads validate perfectly against structured JSON schemas.
* **Phase 6 (Quality Control)**:
  - Content processing completes through all five designated QC gates.
  - Intentionally malformed mock content triggers high-risk QC flags and pauses the system.
* **Phase 7 (Control Plane Dashboard)**:
  - Responsive dark-first UI loads in under 1.5 seconds.
  - Live socket charts display real-time active worker states.
* **Phase 8 (Video Synthesis)**:
  - Final compilation processes generate verified MP4 files with correct subtitles and soundtracks.
* **Phase 9 (Analytics Loop)**:
  - Feedback analysis loops update the strategy weight configuration dynamically based on simulation metrics.
* **Phase 10 (Production Hardening)**:
  - E2E tests run successfully using real dynamic integrations on test sandboxes.

---

## T. ESTIMATED COMPLEXITY OF EACH PHASE

| Phase | Description | T-shirt Size | Story Points | Est. Hours |
| :---: | :--- | :---: | :---: | :---: |
| **P-1** | Foundation & Database setup | S | 3 | 12h |
| **P-2** | Orchestration & Queue implementation | M | 8 | 24h |
| **P-3** | Memory & State Engine modules | S | 5 | 16h |
| **P-4** | Research & Continuous Loop signals | M | 5 | 20h |
| **P-5** | Content Strategy & Script Generation | M | 8 | 28h |
| **P-6** | Independent QC Gate Pipeline | M | 8 | 24h |
| **P-7** | React Control Plane Dashboard | L | 13 | 40h |
| **P-8** | Video Composition & Audio Synthesis | XL | 21 | 60h |
| **P-9** | Analytics Ingestion & Learning feedback | M | 8 | 24h |
| **P-10**| Production Hardening & Live Verification | L | 13 | 36h |
