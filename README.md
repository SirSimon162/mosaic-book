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
              users, workspaces,         (planned)                 Cloudinary ✓,
              sources, chats,                                      Firecrawl,
              (chunks/messages                                     Tavily,
               later)                                              YouTube, Mem0)
```

### Two pipelines (do not mix)

**1. Ingest (async)** — *designed; not built yet*  
Add source → persist row (`PENDING`) → extract text → chunk → embed → upsert Pinecone → `COMPLETED` / `FAILED`.

Today, creating a text source or uploading a file only **persists** the row (and Cloudinary URL when applicable). Status stays `PENDING` until the ingest worker exists.

**2. Query (request path)** — *planned*  
User question → query embedding → similarity search (top-k) → LLM with retrieved passages → answer (+ citations).

Optional later: **Mem0** for cross-chat memory; **Tavily** as a query-time web search tool (not the same as indexing a saved source).

---

## Domain model

| Concept | Meaning |
|---------|---------|
| **User** | Account (email + password hash, profile fields, role) |
| **Workspace** | Container for sources and chats; has an **owner** and optional **members** |
| **Source** | One material + `type` + `status` + optional `source` (inline text / URL) and/or `fileUrl` (Cloudinary) |
| **Chat** | Conversation thread in a workspace; `userId` = who created it |
| **Chunk** | Text slice of a source (planned; not in DB yet) |
| **Message** | User / assistant turns (planned; not in DB yet) |
| **Artifact** | Learn outputs (planned) |

### Source types (`SourceType`)

| Enum | How it enters the API today | Typical ingest (later) |
|------|----------------------------|------------------------|
| `TEXT` / `MARKDOWN` | JSON body → `source` column | Shared pipeline |
| `PDF` / `DOC` / `CSV` | Multipart upload → Cloudinary → `fileUrl` | Download / extract → shared pipeline |
| `JSON` | Schema-ready; upload allowlist includes `.json` | Same as other files |
| `WEBSITE` | Not wired yet | Firecrawl → text → shared pipeline |
| `YOUTUBE` | Not wired yet | Transcript → text → shared pipeline |

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
  ├── source      String?  (inline text or URL, depending on type)
  └── fileUrl     String?  (Cloudinary delivery URL for uploads)
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
- File upload: **membership check runs before multer/Cloudinary** so a bad workspace id never creates an orphan blob.

### Delete semantics

- **Source delete (today):** best-effort Cloudinary destroy when `fileUrl` is set, then delete the Postgres row. Pinecone cleanup lands with ingest.
- **Source delete (later):** also remove corresponding Pinecone vectors (and future chunk rows).
- **Workspace delete:** cascades chats/sources in Postgres; vectors for that namespace must be cleared in app code when RAG exists.

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
- Errors: `AppError` + `Status.*`; central `errorHandler`. Prefer throw + bubble — not `try/catch` that only rethrows.
- `requireAuth` sets `req.userId`.

---

## Workspace & sources (implemented)

All under `/api/workspace`, behind `requireAuth`. Membership = owner or member (`getWorkspace` / `requireWorkspaceAccess`).

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/workspace/create` | Create workspace; creator is owner + member |
| `GET` | `/api/workspace/` | List workspaces for current user |
| `GET` | `/api/workspace/:id` | Workspace details (users, chats stub, sources list) |
| `POST` | `/api/workspace/:workspaceId/source` | Create `TEXT` / `MARKDOWN` source (JSON: `type`, `title`, `content`) |
| `POST` | `/api/workspace/:workspaceId/source/upload` | Multipart: `file` + `type` + `title` (`PDF` / `DOC` / `CSV`); Cloudinary → `fileUrl` |
| `GET` | `/api/workspace/:workspaceId/source/:sourceId` | Source details (`source`, `fileUrl`, …) |
| `DELETE` | `/api/workspace/:workspaceId/source/:sourceId` | Delete source (+ best-effort Cloudinary) |

Upload order: `requireWorkspaceAccess` → `multer` (Cloudinary storage, ~20 MB limit) → persist row.

### Server layout (current)

```
server/src/
  app.ts / server.ts
  config/          # env (incl. Cloudinary keys)
  lib/             # prisma, AppError, Status, api-response, cloudinary-config
  middleware/      # errorHandler, notFound, requireAuth
  utils/           # hash, jwt, cookies
  modules/
    auth/
    user/
    health/
    workspace/     # routes, service, repository, types
  routes/
  types/
  generated/prisma/
```

Layering: **route → service → repository → Prisma** (external providers in `lib/` for now).

---

## Target modules

| Module | Responsibility | Status |
|--------|----------------|--------|
| `auth` / `user` / `health` | Account + profile + liveness | Done |
| `workspace` | Create / list / get; enforce owner/member | Done |
| sources (inside `workspace`) | Text/md create; file upload; get; delete | Done (persist only; no ingest) |
| website / YouTube source adapters | URL → extract → same Source row | **Next** (or ingest next) |
| `chat` | Threads, messages, ask (RAG) | Schema stub |
| `learn` | Artifacts | Later |
| `rag` / `lib/rag` | Chunk, embed, Pinecone, prompts | Later |
| `lib/providers/` | Firecrawl, OpenAI, Tavily, YT, Mem0 | Later |
| Cloudinary | Upload + delete helpers | Done (wired for file sources) |

---

## Workspace settings (later)

Optional fields or JSON on `Workspace`, e.g. default model, `topK`, Tavily on/off. Not required for the current workspace API.

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
| ✅ | Prisma: Workspace, Chat, Source (+ `fileUrl`) | Migrated |
| ✅ | Workspace API | Create, list, get; membership checks |
| ✅ | Source API (text/md) | Create with `PENDING`; content in `source` |
| ✅ | File upload (PDF / DOC / CSV) | Cloudinary `fileUrl`; authz before upload |
| **→ 1** | **Remaining source types** | Website / YouTube (store URL in `source`) |
| **→ 2** | **Ingest pipeline** | Extract → chunk → embed → Pinecone → `COMPLETED` / `FAILED` |
| 3 | Chat + RAG ask | Messages + retrieval in workspace namespace |
| 4 | Dashboard + shell UI | May hide multi-workspace switcher |
| 5 | Tavily, Learn, Mem0, rate limits | Hardening and extras |

Ingest stays **async**: return source id + `PENDING`, process in the background.

---

## Security notes

- Enforce **owner or member** on every workspace-scoped route.  
- Never return `passwordHash`.  
- JWT logout clears the cookie only; tokens remain valid until `exp`.  
- `httpOnly` cookies cannot be cleared from the frontend — use `POST /api/auth/logout`.  
- Do not upload to Cloudinary before membership is confirmed.

---

## Environment (server)

**Required:** `DATABASE_URL`, `JWT_SECRET`, Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

**Optional:** `PORT`, `JWT_EXPIRES_IN`, `NODE_ENV`.

**Later:** OpenAI, Pinecone, Firecrawl, Tavily, Mem0 keys.

---

## Repo layout

```
mosaic-research/
  README.md
  server/     ← Express + Prisma (auth, workspace, sources live)
  client/     ← Next.js (as present in the monorepo)
```

---

## Current status

| Area | Status |
|------|--------|
| Auth (register, login, logout, me) | Implemented |
| Health | Implemented |
| Prisma: User, Workspace, Chat, Source | Migrated (`fileUrl` on Source) |
| Workspace HTTP API | Implemented |
| Source HTTP API (text/md + file upload + get/delete) | Implemented (no ingest yet) |
| Website / YouTube sources | Not implemented |
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
