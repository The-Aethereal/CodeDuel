# CodeDuel — Architecture Documentation

> **Audience:** Software engineers, system designers, and technical interviewers evaluating this codebase.
>
> **Scope:** Current production architecture as implemented in the `contest-platform` monorepo.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [API Architecture](#5-api-architecture)
6. [Real-Time Communication](#6-real-time-communication)
7. [Queue & Worker Architecture](#7-queue--worker-architecture)
8. [Judge & Execution Pipeline](#8-judge--execution-pipeline)
9. [Lifecycle Diagrams](#9-lifecycle-diagrams)
10. [Security Architecture](#10-security-architecture)
11. [Architectural Decisions & Tradeoffs](#11-architectural-decisions--tradeoffs)

---

## 1. System Overview

CodeDuel is a **distributed competitive programming platform** composed of four npm workspace packages orchestrated by a root `package.json`. The system follows a classic **API gateway + async worker** pattern with **Redis** as the coordination backbone for both job queues and real-time pub/sub.

### Complete system architecture

```mermaid
flowchart TB
  subgraph Users["👤 Users"]
    P["Participant"]
    A["Admin"]
  end

  subgraph Frontend["🖥️ packages/frontend — Next.js 16"]
    Pages["App Router Pages"]
    AuthCtx["AuthContext"]
    SocketLib["socket.ts singleton"]
    Monaco["Monaco Editor"]
    Pages --> AuthCtx
    Pages --> SocketLib
    Pages --> Monaco
  end

  subgraph Backend["⚡ packages/backend — Express 5"]
    REST["REST Routes"]
    MW["authGuard / roleCheck"]
    QueueProd["submissionQueue producer"]
    SocketSrv["Socket.io Server"]
    RedisAdpt["@socket.io/redis-adapter"]
    REST --> MW
    REST --> QueueProd
    SocketSrv --> RedisAdpt
  end

  subgraph Worker["⚙️ packages/judge-worker"]
    BullCons["BullMQ Worker<br/>concurrency: 2"]
    Proc["submissionProcessor"]
    Sandbox["SandboxRunner"]
    DuelRes["resolveDuel"]
    Emitter["redis-emitter"]
    BullCons --> Proc --> Sandbox
    Proc --> DuelRes
    Proc --> Emitter
  end

  subgraph Data["💾 packages/database"]
    Prisma["Prisma Client"]
    Schema["schema.prisma"]
    Schema --> Prisma
  end

  subgraph External["Infrastructure"]
    PG[("PostgreSQL 15")]
    RD[("Redis 7")]
    Docker["Docker Engine"]
  end

  P --> Frontend
  A --> Frontend
  Frontend -->|"HTTP"| REST
  Frontend <-->|"WebSocket"| SocketSrv
  REST --> Prisma
  QueueProd -->|"BullMQ"| RD
  RD -->|"dequeue"| BullCons
  BullCons --> Prisma
  Sandbox --> Docker
  Emitter --> RD
  RD --> RedisAdpt
  Prisma --> PG

  classDef fe fill:#6366f1,stroke:#4338ca,color:#fff
  classDef be fill:#0ea5e9,stroke:#0284c7,color:#fff
  classDef wk fill:#10b981,stroke:#059669,color:#fff
  classDef db fill:#8b5cf6,stroke:#7c3aed,color:#fff
  classDef ex fill:#64748b,stroke:#475569,color:#fff

  class Pages,AuthCtx,SocketLib,Monaco fe
  class REST,MW,QueueProd,SocketSrv,RedisAdpt be
  class BullCons,Proc,Sandbox,DuelRes,Emitter wk
  class Prisma,Schema db
  class PG,RD,Docker ex
```

### Data flow summary

| Flow | Path |
|---|---|
| **Authentication** | Browser → `POST /api/auth/login` → JWT in localStorage → `Authorization: Bearer` header |
| **Problem fetch** | Browser → `GET /api/problems/:slug` → Prisma → PostgreSQL |
| **Submission** | Browser → `POST /api/submissions` → DB row + BullMQ job → Worker → Docker → DB update + WebSocket emit |
| **Duel lobby** | Browser → WebSocket `join_lobby_room` → API emits `lobby_update` |
| **Duel resolution** | Worker AC → `resolveDuel()` → transactional ELO update → `duel_finished` emit |

---

## 2. Monorepo Structure

```mermaid
flowchart LR
  subgraph Root["contest-platform/"]
    Scripts["npm scripts<br/>dev:backend<br/>dev:worker<br/>dev:frontend<br/>db:generate<br/>db:push"]
  end

  subgraph Packages["packages/*"]
    FE["frontend<br/>Next.js UI"]
    BE["backend<br/>API + WS"]
    JW["judge-worker<br/>Sandbox executor"]
    DB["@codeduel/database<br/>Prisma schema"]
  end

  subgraph Compose["docker-compose.yml"]
    PG["postgres:15"]
    RD["redis:7"]
  end

  Root --> Packages
  FE -.->|"fetch + socket"| BE
  BE --> DB
  JW --> DB
  BE --> RD
  JW --> RD
  DB --> PG

  classDef pkg fill:#f0fdf4,stroke:#22c55e
  classDef infra fill:#fef9c3,stroke:#eab308

  class FE,BE,JW,DB pkg
  class PG,RD infra
```

### Package ownership boundaries

| Package | Owns | Does NOT own |
|---|---|---|
| `frontend` | UI, client state, WebSocket subscriptions | Business logic, judging, DB writes |
| `backend` | REST API, auth, queue production, lobby WS events | Code execution, verdict computation |
| `judge-worker` | Sandbox execution, verdict persistence, duel resolution emits | HTTP routing, user-facing auth |
| `@codeduel/database` | Schema, migrations, Prisma client | Application logic |

---

## 3. Frontend Architecture

### Stack

- **Next.js 16** App Router with route groups: `(auth)`, `admin/`, `duels/`, `problems/`, `profile/`
- **React 18** with local component state (no global store)
- **Tailwind CSS 3** with CSS variable theming and dark mode
- **Monaco Editor** for the solve experience
- **Socket.io Client** for real-time verdict and duel events

### Application shell

```
src/app/layout.tsx
├── ThemeProvider
├── AuthProvider          ← JWT + user in localStorage
├── ToastProvider
├── Navbar
├── {children}
└── Footer
```

### Key pages

| Route | Component responsibility |
|---|---|
| `/` | Landing page, feature overview |
| `/login`, `/signup` | Auth forms → `AuthContext.login()` |
| `/problems` | Problem list with tag/difficulty filters |
| `/problems/[slug]` | Monaco editor, submit, live verdict UI, duel mode |
| `/duels` | Create/join duel form |
| `/duels/[code]` | Lobby with WebSocket participant sync |
| `/duels/[code]/summary` | Post-game ELO and code recap |
| `/profile/[username]` | Stats, heatmap, streak, submissions |
| `/admin/problems/*` | Admin CRUD guarded by role |

### State management pattern

```mermaid
flowchart TB
  subgraph Global["Global State"]
    Auth["AuthContext<br/>token, user, login/logout"]
    Theme["ThemeContext<br/>light/dark"]
    Toast["ToastProvider<br/>notifications"]
  end

  subgraph Local["Page-Local State"]
    Problems["useState — problem list"]
    Editor["useState — source code"]
    Verdict["useState — submission status"]
    Socket["useEffect — WS listeners"]
  end

  subgraph Persist["Browser Persistence"]
    LS_Token["localStorage: accessToken"]
    LS_Draft["localStorage: code drafts<br/>problemSlug:language"]
  end

  Auth --> LS_Token
  Editor --> LS_Draft
  Socket --> Verdict
```

**Design choice:** No Redux/React Query. For the current scale, page-local state + context providers reduce complexity. A centralized API client and React Query cache are recommended before scaling to contest leaderboards.

### API integration

The frontend calls `http://localhost:4000/api/*` directly (hardcoded). Authenticated requests attach:

```
Authorization: Bearer <accessToken>
```

Socket connection (`src/lib/socket.ts`):

```typescript
io(NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
  autoConnect: false,
  transports: ['websocket'],
});
```

Connections are opened on-demand (solve page, duel lobby) and torn down on unmount.

---

## 4. Backend Architecture

### Entry point

`packages/backend/src/index.ts` bootstraps:

1. Express application with CORS + JSON body parser
2. HTTP server wrapping Express (required for Socket.io)
3. Socket.io with Redis adapter for horizontal scaling
4. Route mounting under `/api/*`
5. Health check at `GET /health`

### Layered structure

```mermaid
flowchart TB
  subgraph Transport["Transport Layer"]
    HTTP["HTTP Server"]
    WS["Socket.io"]
  end

  subgraph Application["Application Layer"]
    Routes["Route Handlers<br/>7 route modules"]
    MW["Middleware<br/>authGuard, roleCheck"]
  end

  subgraph Domain["Domain Layer"]
    DuelSvc["duel.service.ts<br/>(unused duplicate)"]
    Inline["Inline Prisma logic<br/>in route handlers"]
  end

  subgraph Infrastructure["Infrastructure Layer"]
    Queue["submissionQueue.ts"]
    Prisma["@codeduel/database"]
    Redis["ioredis"]
  end

  HTTP --> Routes
  WS --> Routes
  Routes --> MW
  MW --> Inline
  Routes --> Queue
  Inline --> Prisma
  Queue --> Redis
  WS --> Redis

  classDef t fill:#dbeafe,stroke:#3b82f6
  classDef a fill:#dcfce7,stroke:#22c55e
  classDef d fill:#fef3c7,stroke:#f59e0b
  classDef i fill:#f3e8ff,stroke:#a855f7

  class HTTP,WS t
  class Routes,MW a
  class DuelSvc,Inline d
  class Queue,Prisma,Redis i
```

### Middleware

| Middleware | File | Behavior |
|---|---|---|
| `authGuard` | `middleware/authGuard.ts` | Extracts Bearer JWT, verifies with `JWT_SECRET`, attaches `req.user = { id, role }` |
| `roleCheck(role)` | `middleware/authGuard.ts` | Allows access if role matches or user is `admin` |

**Not yet implemented:** rate limiting, request validation library (Zod/Joi), global error handler, structured logging.

---

## 5. API Architecture

### Route modules

| Prefix | Module | Responsibility |
|---|---|---|
| `/api/auth` | `auth.routes.ts` | Signup, login, token issuance |
| `/api/problems` | `problem.routes.ts` | Problem CRUD, search, user solve status |
| `/api/submissions` | `submission.routes.ts` | Submit code, query history |
| `/api/testcases` | `testcase.routes.ts` | Test case CRUD (admin), sample visibility |
| `/api/users` | `user.routes.ts` | Profile, stats, heatmap |
| `/api/duels` | `duel.routes.ts` | Lobby, start, summary |
| `/api/tags` | `tag.routes.ts` | Tag taxonomy |

### Authentication flow

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as /api/auth
  participant DB as PostgreSQL

  Note over C,DB: Signup
  C->>API: POST /signup {email, username, password}
  API->>API: bcrypt.hash(password, 10)
  API->>DB: INSERT User (role: participant)
  API-->>C: 201 {user metadata}

  Note over C,DB: Login
  C->>API: POST /login {email, password}
  API->>DB: SELECT User by email
  API->>API: bcrypt.compare(password, hash)
  API->>API: jwt.sign({id, role}, 15m)
  API->>API: bcrypt.hash(refreshToken)
  API->>DB: INSERT RefreshToken
  API-->>C: 200 {accessToken, refreshToken, user}

  Note over C,DB: Protected request
  C->>API: GET /api/problems/:slug<br/>Authorization: Bearer <JWT>
  API->>API: jwt.verify(token)
  API->>DB: Query with user context
  API-->>C: 200 {problem}
```

### Authorization matrix

| Resource | Public | Participant | Admin |
|---|---|---|---|
| List problems | ✅ | ✅ (+ solve status) | ✅ |
| View unpublished problem | ❌ | ❌ | ✅ |
| Submit code | ❌ | ✅ | ✅ |
| Create/edit problems | ❌ | ❌ | ✅ |
| Manage test cases | ❌ | ❌ | ✅ |
| Create/join duels | ❌ | ✅ | ✅ |

### Request flow diagram

```mermaid
flowchart LR
  REQ["Incoming Request"] --> CORS["CORS"]
  CORS --> JSON["express.json()"]
  JSON --> Route{"Route match?"}

  Route -->|/api/auth/*| AuthR["auth.routes"]
  Route -->|/api/problems/*| ProbR["problem.routes"]
  Route -->|/api/submissions/*| SubR["submission.routes"]
  Route -->|/api/duels/*| DuelR["duel.routes"]
  Route -->|/health| Health["200 OK"]

  AuthR --> Guard{"authGuard?"}
  ProbR --> Guard
  SubR --> Guard
  DuelR --> Guard

  Guard -->|No token| E401["401 Unauthorized"]
  Guard -->|Invalid| E403["403 Forbidden"]
  Guard -->|Valid| Role{"roleCheck?"}
  Role -->|Denied| E403
  Role -->|Allowed| Handler["Route Handler"]
  Handler --> Prisma["Prisma Query"]
  Handler --> Queue["Enqueue Job"]
  Handler --> Emit["Socket.io Emit"]
  Prisma --> Response["JSON Response"]
  Queue --> Response
  Emit --> Response
```

---

## 6. Real-Time Communication

### Architecture

Socket.io runs on the **same HTTP server** as Express. The **Redis adapter** enables multiple API replicas to share room membership. The **judge-worker** uses `@socket.io/redis-emitter` to publish events without maintaining WebSocket connections.

```mermaid
flowchart TB
  subgraph Clients["Browser Clients"]
    C1["Client A"]
    C2["Client B"]
  end

  subgraph API1["API Replica 1"]
    SIO1["Socket.io + Adapter"]
  end

  subgraph API2["API Replica 2"]
    SIO2["Socket.io + Adapter"]
  end

  subgraph Worker["judge-worker"]
    EM["redis-emitter"]
  end

  RD[("Redis Pub/Sub")]

  C1 <-->|WS| SIO1
  C2 <-->|WS| SIO2
  SIO1 <--> RD
  SIO2 <--> RD
  EM --> RD

  classDef client fill:#6366f1,stroke:#4338ca,color:#fff
  classDef server fill:#0ea5e9,stroke:#0284c7,color:#fff
  classDef worker fill:#10b981,stroke:#059669,color:#fff

  class C1,C2 client
  class SIO1,SIO2 server
  class EM worker
```

### Room model

| Room name | Join trigger | Events emitted |
|---|---|---|
| `{submissionId}` | `subscribe_submission` | `submission_update`, `test_case_update` |
| `room_{CODE}` | `join_lobby_room` | `lobby_update`, `duel_started`, `opponent_progress`, `duel_finished` |

### WebSocket communication flow

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as Socket.io (API)
  participant W as judge-worker
  participant R as Redis

  Note over C,R: Submission verdict streaming
  C->>API: subscribe_submission(id)
  API->>API: socket.join(id)
  W->>R: emit submission_update to room id
  R->>API: pub/sub relay
  API->>C: submission_update {status: running}
  W->>R: emit test_case_update
  R->>API: relay
  API->>C: test_case_update {testIndex, verdict}

  Note over C,R: Duel lobby
  C->>API: join_lobby_room(ABC123)
  API->>API: socket.join(room_ABC123)
  API->>C: lobby_update [participants]
  API->>C: duel_started {problemSlug}
```

### Real-time event flow (complete)

```mermaid
flowchart TB
  subgraph ClientEvents["Client → Server"]
    SS["subscribe_submission"]
    US["unsubscribe_submission"]
    JL["join_lobby_room"]
  end

  subgraph BackendEmit["Backend → Client"]
    LU["lobby_update"]
    DS["duel_started"]
  end

  subgraph WorkerEmit["Worker → Client"]
    SU["submission_update"]
    TC["test_case_update"]
    OP["opponent_progress"]
    DF["duel_finished"]
  end

  SS --> Room1["Room: submissionId"]
  JL --> Room2["Room: room_CODE"]

  Room1 --> SU
  Room1 --> TC
  Room2 --> LU
  Room2 --> DS
  Room2 --> OP
  Room2 --> DF
```

---

## 7. Queue & Worker Architecture

### Producer (backend)

```typescript
// packages/backend/src/queue/submissionQueue.ts
new Queue('submission-queue', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});
```

Job payload:

```json
{
  "submissionId": "uuid",
  "problemId": "uuid",
  "language": "python",
  "sourceCode": "...",
  "duelCode": "ABC123",
  "userId": "uuid"
}
```

### Consumer (judge-worker)

```typescript
// packages/judge-worker/src/index.ts
new Worker('submission-queue', processSubmission, { concurrency: 2 });
```

### Queue processing flow

```mermaid
flowchart TB
  subgraph Producer["Backend Producer"]
    Submit["POST /api/submissions"]
    Create["Create DB row<br/>status: queued"]
    Enqueue["submissionQueue.add<br/>'evaluate-code'"]
    Submit --> Create --> Enqueue
  end

  subgraph Redis["Redis / BullMQ"]
    Q["submission-queue"]
    Retry["Retry policy<br/>3 attempts, exp backoff"]
    Q --> Retry
  end

  subgraph Consumer["judge-worker"]
    Dequeue["Worker picks job"]
    Run["processSubmission"]
    Sandbox["SandboxRunner.run"]
    Persist["Update DB + emit WS"]
    Dequeue --> Run --> Sandbox --> Persist
  end

  Enqueue --> Q
  Q --> Dequeue

  Persist -->|fail| Retry
  Retry --> Dequeue
```

---

## 8. Judge & Execution Pipeline

### SandboxRunner execution model

Each submission creates a **temporary directory** on the worker host. Source code is written to disk, mounted into ephemeral Docker containers via bind mounts.

```mermaid
flowchart TB
  Start["Job received"] --> Temp["mkdtemp judge-*"]
  Temp --> Write["Write solution.py / solution.cpp"]
  Write --> Compile{"C++?"}
  Compile -->|Yes| CompCont["judge-cpp compile container<br/>NetworkMode: none"]
  CompCont --> CompErr{"Compile error?"}
  CompErr -->|Yes| CE["Return compile_error"]
  CompErr -->|No| Loop
  Compile -->|No| Loop

  Loop["For each test case"] --> InFile["Write input.txt"]
  InFile --> RunCont["Runtime container<br/>Memory + swap limit<br/>Watchdog timer"]
  RunCont --> Check{"Verdict?"}
  Check -->|TLE| Kill["container.kill()"]
  Check -->|MLE| OOM["OOMKilled inspect"]
  Check -->|RE| Exit["Non-zero exit code"]
  Check -->|OK| Compare["Compare stdout vs expected"]
  Compare -->|Mismatch| WA["wrong_answer"]
  Compare -->|Match| Next{"More tests?"}
  Next -->|Yes| Loop
  Next -->|No| AC["accepted"]
  WA --> Short["Short-circuit return"]
  Kill --> Short
  OOM --> Short
  RE --> Short
  Short --> Cleanup["rm temp dir"]
  AC --> Cleanup
  CE --> Cleanup
```

### Security properties of execution

| Property | Implementation |
|---|---|
| Network isolation | `NetworkMode: 'none'` |
| Memory limit | `Memory` + `MemorySwap` = `memoryLimitMb * 1024²` |
| Time limit | `setTimeout` → `container.kill()` |
| Privilege | Non-root `sandboxuser` (UID 1000) in images |
| Filesystem | Bind mount single temp dir; cleaned in `finally` |
| Output truncation | `actualOutput` capped at 1000 chars in DB |

### Supported languages

| Language | Image | Status |
|---|---|---|
| Python | `judge-python` (3.11-alpine) | ✅ Production |
| C++ | `judge-cpp` (GCC 13) | ✅ Production |
| Java, JS, Go, Rust | — | 🗺️ Schema + UI only |

---

## 9. Lifecycle Diagrams

### Practice submission lifecycle

```mermaid
stateDiagram-v2
  [*] --> pending: User clicks Submit
  pending --> queued: API persists + enqueues
  queued --> running: Worker picks job
  running --> accepted: All tests pass
  running --> wrong_answer: Output mismatch
  running --> time_limit_exceeded: Watchdog kill
  running --> memory_limit_exceeded: OOM
  running --> runtime_error: Non-zero exit
  running --> compile_error: C++ compile fail
  running --> system_error: Worker crash
  accepted --> [*]
  wrong_answer --> [*]
  time_limit_exceeded --> [*]
  memory_limit_exceeded --> [*]
  runtime_error --> [*]
  compile_error --> [*]
  system_error --> [*]
```

### Submission lifecycle (sequence)

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant FE as Frontend
  participant API as Backend
  participant Q as BullMQ
  participant W as Worker
  participant D as Docker
  participant DB as PostgreSQL

  U->>FE: Submit code
  FE->>API: POST /api/submissions
  API->>DB: INSERT (queued)
  API->>Q: add job
  API-->>FE: submissionId
  FE->>FE: subscribe_submission(id)

  Q->>W: dequeue
  W->>DB: status → running
  W-->>FE: submission_update (running)

  loop Test cases
    W->>D: execute container
    D-->>W: stdout / error
    W->>DB: INSERT SubmissionTestResult
    W-->>FE: test_case_update
    alt First failure
      W->>DB: final status
      W-->>FE: submission_update (verdict)
    end
  end

  W->>DB: final status + score
  W-->>FE: submission_update (accepted)
```

### Duel lifecycle

```mermaid
stateDiagram-v2
  [*] --> WAITING: POST /duels/create
  WAITING --> WAITING: POST /duels/join
  WAITING --> ONGOING: POST /room/:code/start
  ONGOING --> FINISHED: First AC submission
  FINISHED --> [*]

  note right of WAITING
    lobby_update events
    Participants join via code
  end note

  note right of ONGOING
    duel_started → problem assigned
    opponent_progress events
  end note

  note right of FINISHED
    ELO updated
    duel_finished event
    Summary page available
  end note
```

### Duel lifecycle (sequence)

```mermaid
sequenceDiagram
  autonumber
  participant P1 as Player 1 (Creator)
  participant P2 as Player 2
  participant API as Backend
  participant WS as Socket.io
  participant W as Worker

  P1->>API: POST /duels/create {difficulty, duration}
  API-->>P1: {code: ABC123}
  P1->>WS: join_lobby_room(ABC123)
  P2->>API: POST /duels/join {code}
  API->>WS: lobby_update → room_ABC123
  P2->>WS: join_lobby_room(ABC123)

  P1->>API: POST /room/ABC123/start
  API->>API: Select random eligible problem
  API->>WS: duel_started {problemSlug}
  WS->>P1: redirect to problem
  WS->>P2: redirect to problem

  P1->>API: POST /submissions {duelCode: ABC123}
  W->>W: Evaluate in sandbox
  W->>WS: opponent_progress → room_ABC123
  W->>W: resolveDuel(winnerId)
  W->>WS: duel_finished {winnerId, loserId}
  WS->>P1: show result
  WS->>P2: show result
```

### Contest lifecycle (planned)

> Not yet implemented. Architectural target for the contest module:

```mermaid
stateDiagram-v2
  [*] --> DRAFT: Admin creates contest
  DRAFT --> REGISTRATION: Publish contest
  REGISTRATION --> LIVE: Start time reached
  LIVE --> FROZEN: End time reached
  FROZEN --> ARCHIVED: Standings finalized
  ARCHIVED --> [*]

  note right of LIVE
    Multiple problems
    Penalty-based ranking
    Submission rate limits
  end note
```

### Judge pipeline (detailed)

```mermaid
flowchart LR
  subgraph Input["Input"]
    Job["BullMQ Job"]
  end

  subgraph Load["Load Phase"]
    Problem["Fetch problem + test_cases<br/>ORDER BY order_index"]
  end

  subgraph Execute["Execute Phase"]
    SR["SandboxRunner.run()"]
    CB["onTestCaseComplete callback"]
    SR --> CB
  end

  subgraph Persist["Persist Phase"]
    STR["SubmissionTestResult rows"]
    SubUp["Submission status/score"]
    CB --> STR
    SR --> SubUp
  end

  subgraph Notify["Notify Phase"]
    SU["submission_update"]
    TC["test_case_update"]
    OP["opponent_progress (duel)"]
    STR --> TC
    SubUp --> SU
    TC --> OP
  end

  subgraph Resolve["Resolve Phase"]
    Duel{"AC + duel?"}
    ELO["resolveDuel()"]
    Duel -->|Yes| ELO
    ELO --> DF["duel_finished"]
  end

  Job --> Problem --> SR
  SubUp --> Duel
```

---

## 10. Security Architecture

### Threat model

```mermaid
flowchart TB
  subgraph Threats["Threat Actors & Vectors"]
    T1["Malicious user code"]
    T2["Stolen JWT"]
    T3["Brute-force auth"]
    T4["Queue flooding"]
    T5["IDOR on submissions"]
  end

  subgraph Mitigations["Current Mitigations"]
    M1["Docker sandbox<br/>no network, mem cap"]
    M2["Short-lived JWT (15m)"]
    M3["bcrypt password hash"]
    M4["🗺️ Rate limiting planned"]
    M5["Author/admin check on GET /submissions/:id"]
  end

  T1 --> M1
  T2 --> M2
  T3 --> M3
  T4 --> M4
  T5 --> M5
```

### JWT flow

| Token | Lifetime | Storage | Validation |
|---|---|---|---|
| Access token | 15 minutes | Client localStorage | `authGuard` on each request |
| Refresh token | 7 days | PostgreSQL (hashed) | 🗺️ `/api/auth/refresh` not yet wired |

### Secure code execution checklist

- [x] Separate worker process (never on API server)
- [x] Ephemeral containers per test case
- [x] Network disabled
- [x] Memory + swap capped
- [x] Time limit enforced via watchdog
- [x] Non-root container user
- [x] Temp directory cleanup in `finally`
- [ ] seccomp/AppArmor profiles (roadmap)
- [ ] Read-only root filesystem (roadmap)
- [ ] gVisor/Firecracker runtime (roadmap)

---

## 11. Architectural Decisions & Tradeoffs

### Why BullMQ instead of synchronous judging?

**Problem:** Running user code in the API process blocks the event loop and creates a single point of failure.

**Decision:** Enqueue every submission; dedicated workers consume at controlled concurrency.

**Tradeoff:** Verdicts are eventually consistent (typically sub-second). Requires Redis availability.

**Alternative considered:** Serverless functions (AWS Lambda). Rejected for local dev complexity and cold-start latency on compile-heavy C++.

### Why Docker instead of isolate/nsjail?

**Decision:** Dockerode-managed containers with cgroup limits.

**Tradeoff:** Requires Docker daemon on worker nodes; weaker isolation than microVMs.

**Alternative considered:** Piston API, Judge0 hosted service. Rejected to maintain full control and avoid vendor dependency.

### Why Redis for both queue and Socket.io?

**Decision:** Single Redis cluster serves BullMQ and Socket.io pub/sub.

**Tradeoff:** Redis is a critical dependency; failure affects both async processing and real-time.

**Alternative considered:** Separate Redis instances for queue vs pub/sub. Deferred until scale requires isolation.

### Why Prisma shared package?

**Decision:** `@codeduel/database` exports one Prisma client used by backend and worker.

**Tradeoff:** Schema changes require coordinated deploys of both services.

**Alternative considered:** Generated OpenAPI types for frontend. Frontend currently uses local interfaces; Prisma types could be shared via a `@codeduel/types` package.

---
