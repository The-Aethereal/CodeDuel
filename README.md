

# CodeDuel

### A competitive programming platform with real-time 1v1 duels, async code judging, and live verdict streaming.

[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Sandbox-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)
[![BullMQ](https://img.shields.io/badge/Queue-BullMQ-FF6B6B?style=for-the-badge)](https://docs.bullmq.io)
[![Socket.io](https://img.shields.io/badge/Real--Time-Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)


[**Quick Start**](#quick-start) · [**Architecture**](#high-level-architecture) 

</div>

---

## Overview

**CodeDuel** (`contest-platform`) is a full-stack competitive programming system designed with a Next.js client, a stateless Express API gateway, a horizontally scalable BullMQ worker fleet, Docker-isolated code execution, and Redis-backed real-time events.


 | CodeDuel approach |
|------|
| Async queue + dedicated judge workers |
| Socket.io rooms with per-test-case streaming |
| Ephemeral Docker containers, no network, cgroup limits |
| Monorepo with clear producer/consumer boundaries |
|  Full lifecycle: `queued → running → verdict` with granular events |

```mermaid
flowchart LR
  subgraph Client["🖥️ Client Layer"]
    FE["Next.js 16<br/>Monaco Editor"]
  end

  subgraph API["⚡ API & Real-Time Layer"]
    BE["Express 5 API"]
    SIO["Socket.io Server"]
  end

  subgraph Queue["📬 Queue Layer"]
    RQ["Redis + BullMQ<br/>submission-queue"]
  end

  subgraph Worker["⚙️ Worker Layer"]
    JW["judge-worker"]
  end

  subgraph Exec["🔒 Execution Layer"]
    PY["judge-python"]
    CPP["judge-cpp"]
  end

  subgraph Data["💾 Data Layer"]
    PG[("PostgreSQL")]
    RD[("Redis")]
  end

  FE -->|"REST /api/*"| BE
  FE <-->|"WebSocket"| SIO
  BE --> PG
  BE --> RQ
  RQ --> JW
  JW --> PG
  JW --> PY
  JW --> CPP
  JW -->|"redis-emitter"| RD
  RD --> SIO
  BE --> RD

  classDef client fill:#6366f1,stroke:#4338ca,color:#fff
  classDef api fill:#0ea5e9,stroke:#0284c7,color:#fff
  classDef queue fill:#f59e0b,stroke:#d97706,color:#fff
  classDef worker fill:#10b981,stroke:#059669,color:#fff
  classDef exec fill:#ef4444,stroke:#dc2626,color:#fff
  classDef data fill:#8b5cf6,stroke:#7c3aed,color:#fff

  class FE client
  class BE,SIO api
  class RQ queue
  class JW worker
  class PY,CPP exec
  class PG,RD data
```

---


## Feature Overview

### User Features

| Feature | Description |
|---|---|
| **Account & profiles** | Sign up, log in, view solve stats, activity heatmap, streaks, and recent submissions |
| **Problem discovery** | Search, filter by difficulty/tags/status; per-user solve state when authenticated |
| **In-browser IDE** | Monaco editor with language templates, local draft auto-save (3s debounce) |
| **Submission history** | Per-problem and global submission timelines with verdicts and runtime |
| **Dark / light theme** | System-aware theming across the application shell |

### Duel Features

| Feature | Description |
|---|---|
| **Room creation** | 6-character lobby codes, difficulty tier, configurable duration |
| **Real-time lobby** | Live participant list via `lobby_update` WebSocket events |
| **Fair problem selection** | Random unpublished problem neither player has AC'd |
| **Live opponent progress** | Per-test-case pass count streamed to duel room |
| **First-AC wins** | Automatic match resolution on accepted submission |
| **ELO rating system** | Standard ELO (K=32) with match history and post-game summary |
| **Post-game recap** | Code, runtime, memory, ELO delta for each player |

### Admin Features

| Feature | Description |
|---|---|
| **Problem CRUD** | Create, edit, publish/unpublish problems with rich metadata |
| **Test case management** | Sample vs hidden cases, ordered evaluation, I/O pairs |
| **Tag taxonomy** | Categorize problems (DP, graphs, strings, etc.) |
| **Role-based access** | `admin` role gates all management endpoints |

### Real-Time Features

| Event | Direction | Purpose |
|---|---|---|
| `subscribe_submission` | Client → Server | Join submission verdict room |
| `submission_update` | Server → Client | Status transitions and final verdict |
| `test_case_update` | Server → Client | Per-test progress bar updates |
| `join_lobby_room` | Client → Server | Join duel lobby channel |
| `lobby_update` | Server → Client | Participant list changes |
| `duel_started` | Server → Client | Redirect all clients to assigned problem |
| `opponent_progress` | Server → Client | Live test-case pass count in duels |
| `duel_finished` | Server → Client | Winner/loser announcement |

### Judge Features

| Feature | Description |
|---|---|
| **Async evaluation** | BullMQ job per submission, 3 retries with exponential backoff |
| **Docker sandbox** | Isolated `judge-python` and `judge-cpp` images |
| **Verdict taxonomy** | AC, WA, TLE, MLE, RE, CE, system error |
| **Short-circuit evaluation** | Stop on first failing test case (ICPC-style) |
| **Per-test persistence** | `SubmissionTestResult` rows for audit and UI replay |
| **Compile step** | Separate compilation container for C++ before runtime |

### Security Features

| Feature | Description |
|---|---|
| **JWT authentication** | Short-lived access tokens (15m) on protected routes |
| **Refresh token storage** | Hashed refresh tokens in PostgreSQL (rotation endpoint planned) |
| **bcrypt password hashing** | Salt rounds 10 for credentials at rest |
| **Role-based authorization** | `authGuard` + `roleCheck` middleware |
| **Network isolation** | `NetworkMode: 'none'` on all judge containers |
| **Resource limits** | Memory + swap caps, watchdog timer for TLE |
| **Non-root sandbox users** | UID 1000 `sandboxuser` in judge images |

---

## Screenshots

﻿<div align="center">

### Landing & Problem Discovery
<img width="2848" height="1620" alt="{7B75566F-2735-43BA-93E2-45E9018276A6}" src="https://github.com/user-attachments/assets/5510ec4d-05aa-4994-a63d-38f9262b0759" />

<img width="2842" height="1619" alt="{84E57222-025B-4446-BD26-0A89F281E5E3}" src="https://github.com/user-attachments/assets/33372f79-1989-44c7-b865-a962f302f76d" />


### Problem Solve Interface

<img width="2843" height="1620" alt="{DD229689-4920-432E-9576-AE878E65BF0F}" src="https://github.com/user-attachments/assets/cdb4da31-5eaa-43fb-9cd7-facf14a8f314" />


### Duel Lobby

<img width="2844" height="1612" alt="{2057B5FC-70F9-48A1-92B0-C33F9DFEF3F4}" src="https://github.com/user-attachments/assets/eddf3d36-0d0d-43ff-806e-f20f8ed0256e" />

<img width="2880" height="1618" alt="{50825216-465B-4912-AD3C-C97A794D3269}" src="https://github.com/user-attachments/assets/1c0207b7-21a9-45a2-b992-ef0787d29940" />


### Profile

<img width="2837" height="1620" alt="{CFABB91A-AB49-4692-8AF5-4FF433379DFA}" src="https://github.com/user-attachments/assets/9816322b-9132-40d3-b3cb-60cb984c7a27" />


### Admin Panel
<img width="2835" height="1620" alt="{5821F780-9C17-47AF-8C70-064B0FA97CFE}" src="https://github.com/user-attachments/assets/8ad3aded-1fca-48a8-a40f-2e3725d1637b" />
<img width="2821" height="1620" alt="{F3136F0C-613A-4CFF-91DF-DB2CE301621A}" src="https://github.com/user-attachments/assets/2ca86564-01ed-4bb4-8470-08c903c16adf" />


---

## Technology Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| Next.js | 16 | App Router, SSR/CSR hybrid |
| React | 18 | UI components |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| Monaco Editor | 4.7 | In-browser code editor |
| Socket.io Client | 4.8 | Real-time events |

### Backend

| Technology | Version | Role |
|---|---|---|
| Express | 5 | REST API gateway |
| Socket.io | 4.8 | WebSocket server |
| BullMQ | 5.78 | Job queue producer |
| jsonwebtoken | 9 | JWT access tokens |
| bcryptjs | 3 | Password & refresh token hashing |
| ioredis | 5.11 | Redis client |

### Database

| Technology | Version | Role |
|---|---|---|
| PostgreSQL | 15 | Primary relational store |
| Prisma | 6.19 | ORM, migrations, type generation |
| `@codeduel/database` | workspace | Shared Prisma client package |

### Queue

| Technology | Version | Role |
|---|---|---|
| Redis | 7 | BullMQ backing store |
| BullMQ | 5 | Reliable async job processing |

### Real-Time

| Technology | Version | Role |
|---|---|---|
| Socket.io | 4.8 | Bidirectional client ↔ API events |
| `@socket.io/redis-adapter` | 8.3 | Cross-process pub/sub for API replicas |
| `@socket.io/redis-emitter` | 5.1 | Worker → client event emission |

### Infrastructure

| Technology | Role |
|---|---|
| npm workspaces | Monorepo package management |
| tsx | TypeScript dev execution |
| dotenv | Environment configuration |

### Containerization

| Image | Role |
|---|---|
| `postgres:15-alpine` | Development database |
| `redis:7-alpine` | Queue + pub/sub |
| `judge-python` | Python 3.11 sandbox |
| `judge-cpp` | GCC 13 compile + run sandbox |


---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/The-Aethereal/CodeDuel.git
cd CodeDuel
npm install
```

### 2. Start infrastructure

```bash
docker pull postgres:15-alpine

docker compose -f packages/docker-compose.yml up -d
```

This starts PostgreSQL (`localhost:5432`, db `codeduel`) and Redis (`localhost:6379`).

### 3. Configure environment

Create `packages/backend/.env`:

```env
DATABASE_URL=postgresql://admin:password123@localhost:5432/codeduel
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-use-64-char-random-string
PORT=4000
```

Create `packages/judge-worker/.env` (same `DATABASE_URL` and `REDIS_URL`).

Create `packages/frontend/.env.local`:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 4. Initialize the database

```bash
npm run db:generate
npm run db:push
```

### 5. Build judge sandbox images

```bash
# Linux / macOS / Git Bash
bash packages/judge-worker/docker/build-images.sh

# Windows (PowerShell) — run equivalent docker build commands
docker build -t judge-python packages/judge-worker/docker/judge-python
docker build -t judge-cpp packages/judge-worker/docker/judge-cpp
```

### 6. Start all services

Open three terminals:

```bash
# Terminal 1 — API + WebSockets
npm run dev:backend

# Terminal 2 — Judge worker
npm run dev:worker

# Terminal 3 — Frontend
npm run dev:frontend
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API + WebSocket | http://localhost:4000 |

### 7. Create an admin user (optional)(can also be done from prisma studios)

After signing up via the UI, promote your user in PostgreSQL:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'you@example.com';
```

---

## Repository Structure

```
contest-platform/
├── package.json                 # Workspace root scripts
├── README.md                      # You are here
├── ARCHITECTURE.md                # Detailed system architecture
├── SYSTEM_DESIGN.md               # Production system design
├── DATABASE_DESIGN.md             # Schema & ERD documentation
├── DEPLOYMENT.md                  # Deployment runbook
├── CONTRIBUTING.md                # Contribution guidelines
│
└── packages/
    ├── frontend/                  # Next.js 16 web application
    │   └── src/
    │       ├── app/               # App Router pages
    │       ├── components/ui/     # Design system components
    │       └── lib/               # Auth, socket, utilities
    │
    ├── backend/                   # Express API + Socket.io gateway
    │   └── src/
    │       ├── routes/            # REST endpoint handlers
    │       ├── middleware/        # JWT auth guards
    │       ├── queue/             # BullMQ producer
    │       └── services/          # Domain services
    │
    ├── judge-worker/              # BullMQ consumer + Docker sandbox
    │   └── src/
    │       ├── processors/        # Submission evaluation pipeline
    │       ├── sandbox/           # DockerRunner isolation layer
    │       ├── services/          # Duel resolution (ELO)
    │       └── docker/            # Sandbox Dockerfiles
    │
    ├── database/                  # @codeduel/database
    │   ├── prisma/schema.prisma   # Canonical data model
    │   └── src/index.ts           # Shared Prisma client
    │
    └── docker-compose.yml         # Local Postgres + Redis
```

### Monorepo dependency graph

```mermaid
flowchart TB
  subgraph Apps["Application Layer"]
    FE["packages/frontend"]
    BE["packages/backend"]
    JW["packages/judge-worker"]
  end

  subgraph Shared["Shared Layer"]
    DB["@codeduel/database"]
  end

  subgraph Infra["Infrastructure Layer"]
    PG[("PostgreSQL")]
    RD[("Redis")]
    DK["Docker Engine"]
  end

  FE -->|"REST + WS"| BE
  BE --> DB
  JW --> DB
  BE -->|"BullMQ produce"| RD
  JW -->|"BullMQ consume"| RD
  JW -->|"redis-emitter"| RD
  BE -->|"redis-adapter"| RD
  DB --> PG
  JW --> DK

  classDef app fill:#6366f1,stroke:#4338ca,color:#fff
  classDef shared fill:#10b981,stroke:#059669,color:#fff
  classDef infra fill:#64748b,stroke:#475569,color:#fff

  class FE,BE,JW app
  class DB shared
  class PG,RD,DK infra
```

---

## High-Level Architecture

```mermaid
flowchart TB
  subgraph L1["Layer 1 — Client"]
    direction LR
    Browser["Browser"]
    Next["Next.js App"]
    Monaco["Monaco Editor"]
    SocketC["Socket.io Client"]
    Browser --> Next
    Next --> Monaco
    Next --> SocketC
  end

  subgraph L2["Layer 2 — API Gateway"]
    direction LR
    Express["Express 5 REST"]
    Auth["JWT authGuard"]
    Routes["Route Handlers"]
    Express --> Auth --> Routes
  end

  subgraph L3["Layer 3 — Real-Time"]
    direction LR
    SIO["Socket.io Server"]
    Adapter["Redis Adapter"]
    Rooms["Submission & Duel Rooms"]
    SIO --> Adapter --> Rooms
  end

  subgraph L4["Layer 4 — Queue"]
    direction LR
    Producer["BullMQ Producer"]
    Queue["submission-queue"]
    Producer --> Queue
  end

  subgraph L5["Layer 5 — Workers"]
    direction LR
    Worker["judge-worker"]
    Processor["submissionProcessor"]
    DuelSvc["duel.service"]
    Worker --> Processor --> DuelSvc
  end

  subgraph L6["Layer 6 — Execution"]
    direction LR
    Runner["SandboxRunner"]
    PyImg["judge-python"]
    CppImg["judge-cpp"]
    Runner --> PyImg
    Runner --> CppImg
  end

  subgraph L7["Layer 7 — Database"]
    direction LR
    Prisma["Prisma ORM"]
    PG[("PostgreSQL 15")]
    Prisma --> PG
  end

  Next -->|"HTTP /api/*"| Express
  SocketC <-->|"WebSocket"| SIO
  Routes -->|"enqueue job"| Producer
  Queue -->|"dequeue"| Worker
  Processor --> Runner
  Routes --> Prisma
  Worker --> Prisma
  Worker -->|"emit via Redis"| Adapter

  classDef l1 fill:#eef2ff,stroke:#6366f1,color:#312e81
  classDef l2 fill:#ecfeff,stroke:#06b6d4,color:#164e63
  classDef l3 fill:#fef3c7,stroke:#f59e0b,color:#78350f
  classDef l4 fill:#fce7f3,stroke:#ec4899,color:#831843
  classDef l5 fill:#d1fae5,stroke:#10b981,color:#064e3b
  classDef l6 fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
  classDef l7 fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95

  class Browser,Next,Monaco,SocketC l1
  class Express,Auth,Routes l2
  class SIO,Adapter,Rooms l3
  class Producer,Queue l4
  class Worker,Processor,DuelSvc l5
  class Runner,PyImg,CppImg l6
  class Prisma,PG l7
```

### Request lifecycle (submission)

```mermaid
sequenceDiagram
  autonumber
  participant U as User Browser
  participant API as Express API
  participant Q as BullMQ / Redis
  participant W as judge-worker
  participant D as Docker Sandbox
  participant DB as PostgreSQL
  participant WS as Socket.io

  U->>API: POST /api/submissions {code, language, problemId}
  API->>DB: INSERT submission (status: queued)
  API->>Q: add job {submissionId, sourceCode, ...}
  API-->>U: 201 {submissionId}
  U->>WS: subscribe_submission(submissionId)

  Q->>W: dequeue evaluate-code job
  W->>DB: UPDATE status → running
  W->>WS: submission_update {running}
  loop Each test case
    W->>D: spawn ephemeral container
    D-->>W: stdout / verdict
    W->>DB: INSERT SubmissionTestResult
    W->>WS: test_case_update {index, verdict}
  end
  W->>DB: UPDATE final verdict + score
  W->>WS: submission_update {accepted|WA|TLE|...}
```

---

## Database Design

The CodeDuel database is a **PostgreSQL 15** relational schema managed by **Prisma 6**. It supports:

- User authentication and profiles
- Problem catalog with tags and test cases
- Async submission judging with per-test results
- Real-time 1v1 duels with ELO ratings
- Activity tracking for streaks and heatmaps

### Entity-Relationship Diagram


```mermaid
erDiagram
  User ||--o{ RefreshToken : "has"
  User ||--o{ Problem : "authors"
  User ||--o{ Submission : "submits"
  User ||--o{ ActivityLog : "generates"
  User ||--o{ DuelRoom : "creates"
  User ||--o{ DuelParticipant : "joins"
  User ||--o{ MatchHistory : "records"

  Problem ||--o{ Submission : "receives"
  Problem ||--o{ TestCase : "defines"
  Problem ||--o{ ActivityLog : "tracks"
  Problem ||--o{ DuelRoom : "assigned_to"
  Problem }o--o{ Tag : "tagged_with"

  Submission ||--o{ SubmissionTestResult : "produces"
  Submission }o--o| DuelRoom : "during"

  TestCase ||--o{ SubmissionTestResult : "evaluated_by"

  DuelRoom ||--o{ DuelParticipant : "hosts"
  DuelRoom ||--o{ MatchHistory : "records"
  DuelRoom ||--o{ Submission : "contains"

  User {
    uuid id PK
    varchar email UK
    varchar username UK
    string password_hash
    enum role
    int duel_elo
    int problems_solved_count
    timestamptz created_at
  }

  RefreshToken {
    uuid id PK
    uuid user_id FK
    string token_hash
    timestamptz expires_at
    boolean revoked
  }

  Problem {
    uuid id PK
    varchar slug UK
    varchar title
    text description
    enum difficulty
    int time_limit_ms
    int memory_limit_mb
    boolean is_published
    uuid created_by FK
  }

  TestCase {
    uuid id PK
    uuid problem_id FK
    text input_data
    text expected_output
    boolean is_sample
    int order_index
  }

  Submission {
    uuid id PK
    uuid user_id FK
    uuid problem_id FK
    uuid room_id FK
    enum language
    text source_code
    enum status
    int score
    int exec_time_ms
    float memory_used_mb
    timestamptz submitted_at
  }

  SubmissionTestResult {
    uuid id PK
    uuid submission_id FK
    uuid test_case_id FK
    enum status
    int exec_time_ms
    float memory_used_mb
    text actual_output
    int order_index
  }

  DuelRoom {
    uuid id PK
    varchar code UK
    string difficulty
    int duration_mins
    enum status
    uuid problem_id FK
    uuid creator_id FK
    uuid winner_id
    timestamptz started_at
    timestamptz ended_at
  }

  DuelParticipant {
    uuid id PK
    uuid room_id FK
    uuid user_id FK
    timestamptz joined_at
  }

  MatchHistory {
    uuid id PK
    uuid user_id FK
    uuid opponent_id
    uuid room_id FK
    string result
    int elo_change
    int new_elo
  }

  Tag {
    uuid id PK
    varchar name UK
  }

  ActivityLog {
    uuid id PK
    uuid user_id FK
    uuid problem_id FK
    string event_type
    datetime event_date
  }
```


### Database domain model (grouped view)

```mermaid
flowchart TB
  subgraph Auth["🔐 Authentication Domain"]
    User["User"]
    RefreshToken["RefreshToken"]
    User --> RefreshToken
  end

  subgraph Problems["📚 Problems Domain"]
    Problem["Problem"]
    TestCase["TestCase"]
    Tag["Tag"]
    Problem --> TestCase
    Problem --- Tag
  end

  subgraph Submissions["📤 Submissions Domain"]
    Submission["Submission"]
    STR["SubmissionTestResult"]
    Submission --> STR
    TestCase --> STR
  end

  subgraph Duels["⚔️ Duels Domain"]
    DuelRoom["DuelRoom"]
    DuelParticipant["DuelParticipant"]
    MatchHistory["MatchHistory"]
    DuelRoom --> DuelParticipant
    DuelRoom --> MatchHistory
  end

  subgraph Leaderboard["🏆 Stats Domain"]
    ActivityLog["ActivityLog"]
    User --> ActivityLog
  end

  User --> Submission
  User --> Problem
  User --> DuelRoom
  User --> DuelParticipant
  User --> MatchHistory
  Problem --> Submission
  Problem --> DuelRoom
  DuelRoom --> Submission

  classDef auth fill:#fef3c7,stroke:#f59e0b,color:#78350f
  classDef prob fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
  classDef sub fill:#dcfce7,stroke:#22c55e,color:#14532d
  classDef duel fill:#fce7f3,stroke:#ec4899,color:#831843
  classDef stats fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95

  class User,RefreshToken auth
  class Problem,TestCase,Tag prob
  class Submission,STR sub
  class DuelRoom,DuelParticipant,MatchHistory duel
  class ActivityLog stats
```

---
## API Reference (Summary)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | — | Create account |
| `POST` | `/api/auth/login` | — | Issue JWT + refresh token |
| `GET` | `/api/problems` | Optional | List/filter problems |
| `GET` | `/api/problems/:slug` | JWT | Problem detail |
| `POST` | `/api/problems` | Admin | Create problem |
| `POST` | `/api/submissions` | JWT | Submit code for judging |
| `GET` | `/api/submissions/:id` | JWT | Submission detail |
| `POST` | `/api/duels/create` | JWT | Create duel lobby |
| `POST` | `/api/duels/join` | JWT | Join lobby by code |
| `POST` | `/api/duels/room/:code/start` | JWT | Start duel (creator) |
| `GET` | `/api/duels/room/:code/summary` | JWT | Post-game stats |


---
</div>
