# Mosaic Research

NotebookLM-style study workspace: upload sources, chat with them via RAG, and generate learning artifacts. Users can own multiple private workspaces; each workspace holds its own sources and chats. Sharing can be enabled later via membership; the frontend may only expose a single workspace at first.

---

## Product overview

After account creation / login, the user lands on a dashboard and opens a workspace. The workspace shell navigates between:

| Area | Purpose |
|------|---------|
| **Sources** | Study materials library (add, browse, preview, delete, bulk manage) |
| **Chat** | Ask questions grounded in indexed sources |
| **Learn** | Generate artifacts from sources (summaries, flashcards, notes, etc.) |
| **Settings** | Workspace preferences (model, retrieval top-k, optional web search) |
| **Recents** | Recently opened chats, sources, and artifacts |

Initial entry actions (product framing):

- **Upload source** — add study material and kick off ingest
- **Chat** — converse with indexed knowledge
- **Learn** — produce learning artifacts
- **Recents** — jump back into recent work

### Product constraints

| Concern | v1 approach |
|---------|-------------|
| **Workspaces** | Multi-workspace in the **data model** from day one. UI may show a single default workspace until a switcher exists. |
| **Sharing** | Schema supports **owner** + **members**. UI can stay owner-only until invite flows exist. |
| **Access** | Anyone who is owner **or** member of a workspace can use its chats and sources. |
| **Chat.userId** | Means **creator** of the thread (attribution), not the ACL. Authorization is workspace membership. |

---

## High-level architecture

```
┌─────────────┐     cookie JWT      ┌──────────────────┐
│  Next.js    │ ◄─────────────────► │  Express API     │
│  (client)   │   credentials       │  (server/)       │
└─────────────┘                     └────────┬─────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
              PostgreSQL                 Pinecone                  Providers
              (Prisma)                   (vectors)                 (OpenAI,
              users, workspaces,                                   Cloudinary,
              sources, chats,                                      Firecrawl,
              (chunks/messages                                     Tavily,
               later)                                              YouTube, Mem0)
```

### Two pipelines (do not mix)

**1. Ingest (async)**  
Add source → persist row (`PENDING`) → extract text → chunk → embed → upsert Pinecone → `COMPLETED` / `FAILED`.

**2. Query (request path)**  
User question → query embedding → similarity search (top-k) → LLM with retrieved passages → answer (+ citations).

Optional later: **Mem0** for cross-chat memory; **Tavily** as a query-time web search tool (not the same as indexing a saved source).

---

## Domain model

| Concept | Meaning |
|---------|---------|
| **User** | Account (email + password hash, profile fields, role) |
| **Workspace** | Container for sources and chats; has an **owner** and optional **members** |
| **Source** | One material + `type` + `status` + optional `source` payload (text body or URL) |
| **Chat** | Conversation thread in a workspace; `userId` = who created it |
| **Chunk** | Text slice of a source (planned; not in DB yet) |
| **Message** | User / assistant turns (planned; not in DB yet) |
| **Artifact** | Learn outputs (planned) |

### Source types (`SourceType`)

| Enum | Typical ingest |
|------|----------------|
| `TEXT` / `MARKDOWN` | Body stored in `source` → shared pipeline |
| `PDF` / `DOC` / `CSV` | File upload (e.g. Cloudinary) → extract → shared pipeline |
| `WEBSITE` | Firecrawl → text → shared pipeline |
| `YOUTUBE` | Transcript package → text → shared pipeline |

**Web search (Tavily)** stays a **query-time** tool, not a `SourceType`.

### Source status (`SourceStatus`)

`PENDING` → `PROCESSING` → `COMPLETED` | `FAILED`

Default on create: `PENDING`. (Optional later: `errorMessage` on failure for the UI.)

---

## Data model (Prisma — migrated)

Defined in `server/prisma/schema.prisma`:

```
User
  ├── ownedWorkspaces → Workspace (ownerId, onDelete: Restrict)
  ├── workspaces      → Workspace (many-to-many members)
  └── chats           → Chat (as creator)

Workspace
  ├── owner   → User
  ├── users   → User[] (members)
  ├── chats   → Chat[]   (cascade on workspace delete)
  └── sources → Source[] (cascade on workspace delete)

Chat
  ├── workspaceId → Workspace
  ├── userId      → User (creator, Restrict)
  └── title

Source
  ├── workspaceId → Workspace
  ├── type        → SourceType
  ├── status      → SourceStatus (default PENDING)
  ├── title       (default "My Mosaic")
  └── source      String?  (URL or inline text, depending on type)
```

Still to add when building RAG / chat messages: `Chunk`, `Message`, `Artifact`, and any Pinecone id fields you want mirrored in Postgres.

---

## RAG design

### Indexing

```
Source → extract text → chunk → OpenAI embeddings → Pinecone upsert
         (adapters)      (split)   (vectors)           (namespace = workspaceId)
```

### Querying

```
User question → embed query → Pinecone top-k → prompt + passages → LLM → response
                                              (+ optional Mem0 / Tavily)
```

### Isolation and authz

- Pinecone **namespace = `workspaceId`**.
- Every API that touches workspace data must assert:  
  `req.userId` is **owner** or **member** of that workspace.
- Do **not** authorize chat access with `chat.userId === req.userId` alone if members should share threads.

### Delete semantics

Deleting a source must remove Postgres rows (and future chunks) **and** corresponding Pinecone vectors. Deleting a workspace cascades chats/sources in Postgres; vectors for that namespace must be cleared in app code.

---

## Auth (implemented)

Stateless **JWT in an `httpOnly` cookie**.

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/auth/register` | No | Create user, set cookie |
| `POST` | `/api/auth/login` | No | Verify password, set cookie |
| `POST` | `/api/auth/logout` | No | Clear cookie |
| `GET` | `/api/user/me` | Yes | Profile |
| `GET` | `/api/health` | No | Liveness |

### Conventions

- Password hashing: Argon2id.
- JWT payload: `{ sub, role, email }`.
- Cookie: `httpOnly`, `sameSite: "lax"`, `secure` in production.
- Envelope: `{ success: true, result }` / `{ success: false, error }`.
- Errors: `AppError` + `Status.*`; `requireAuth` sets `req.userId`.

### Server layout (current)

```
server/src/
  app.ts / server.ts
  config/
  lib/             # prisma, AppError, Status, api-response
  middleware/      # errorHandler, notFound, requireAuth
  utils/           # hash, jwt, cookies
  modules/
    auth/
    user/
    health/
  routes/
  types/
```

Layering: **route → service → repository → Prisma** (providers later).

---

## Target modules

| Module | Responsibility | Status |
|--------|----------------|--------|
| `auth` / `user` / `health` | Account + profile + liveness | Done |
| `workspace` | Create / list / get; enforce owner/member | **Next** |
| `source` | CRUD-ish, status, trigger ingest | Schema only |
| `chat` | Threads, messages, ask (RAG) | Schema stub |
| `learn` | Artifacts | Later |
| `rag` / `lib/rag` | Chunk, embed, Pinecone, prompts | Later |
| `lib/providers/` | Cloudinary, Firecrawl, OpenAI, Tavily, YT, Mem0 | Later |

---

## Workspace settings (later)

Optional fields or JSON on `Workspace`, e.g. default model, `topK`, Tavily on/off. Not required for the first workspace API.

---

## Frontend surfaces (planned)

1. Auth against existing API  
2. Dashboard → open a workspace (default = first owned / create one)  
3. Shell: Sources | Chat | Learn | Settings (+ Recents)  
4. Sources / Chat / Learn as features land  

Client: Next.js with `credentials: "include"`.

---

## Build order

| Step | Milestone | Notes |
|------|-----------|--------|
| ✅ | Auth + health | Done |
| ✅ | Prisma: Workspace, Chat, Source | Migrated |
| **→ 1** | **Workspace API** | Create, list, get; `requireAuth`; owner + connect as member |
| 2 | Dashboard + shell UI | Nav only; may hide multi-workspace switcher |
| 3 | Source API (text/md) | Create with `PENDING`; no vectors yet |
| 4 | Ingest pipeline | Chunk → embed → Pinecone → `COMPLETED` / `FAILED` |
| 5 | Chat + RAG ask | Messages + retrieval in workspace namespace |
| 6 | PDF / web / YT adapters | Same ingest pipeline |
| 7 | Tavily, Learn, Mem0, rate limits | Hardening and extras |

Ingest stays **async**: return source id + `PENDING`, process in the background.

---

## Security notes

- Enforce **owner or member** on every workspace-scoped route.  
- Never return `passwordHash`.  
- JWT logout clears the cookie only; tokens remain valid until `exp`.  
- `httpOnly` cookies cannot be cleared from the frontend — use `POST /api/auth/logout`.

---

## Environment (server)

**Auth (required today):** `DATABASE_URL`, `JWT_SECRET`, optional `PORT`, `JWT_EXPIRES_IN`, `NODE_ENV`.

**Later:** OpenAI, Pinecone, Cloudinary, Firecrawl, Tavily, Mem0 keys.

---

## Repo layout

```
mosaic-research/
  README.md
  server/     ← Express + Prisma (auth live; workspace API next)
  client/     ← Next.js (as present in the monorepo)
```

---

## Current status

| Area | Status |
|------|--------|
| Auth (register, login, logout, me) | Implemented |
| Health | Implemented |
| Prisma: User, Workspace, Chat, Source | **Migrated** |
| Workspace / source / chat HTTP APIs | Not implemented |
| RAG / Pinecone / Learn / Mem0 | Designed only |
| Rate limiting | Deferred |
| Multi-workspace UI / invites | Schema-ready; UI later |

---

## Glossary

| Term | Meaning |
|------|---------|
| **RAG** | Retrieval-Augmented Generation |
| **Chunk** | Passage cut from a source for embedding |
| **Namespace** | Pinecone partition per `workspaceId` |
| **Ingest** | Source → searchable vectors |
| **Member** | User with access to a workspace (alongside owner) |
| **Chat creator** | `Chat.userId` — who started the thread, not the ACL |
| **Mem0** | External long-term memory layer |
