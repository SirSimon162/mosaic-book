# Mosaic Research

A private study workspace. Sign in, open a workspace, add sources, and ask questions that are answered from those sources. Each workspace belongs to its owner and can include other members.

Ingest, embeddings, and chat are in place. PDFs, websites, YouTube, and typed notes are stored, processed in the background, chunked, embedded, and marked `COMPLETED` or `FAILED`. A chat reply searches those chunks and streams an answer with citations. Generated study artifacts are still ahead.

---

## What works today

| Surface | Behavior |
|---------|----------|
| Account | Register, log in, log out, and restore the session from the auth cookie |
| Workspaces | List, open, create, rename, delete, and set the default model (`gpt-4o-mini` or `gpt-4o`) |
| Sources | Add a PDF, import a website or YouTube URL, save text or Markdown, search titles, find a passage, preview, refresh, reprocess, and delete |
| Ingest | After create/import, a row is `PENDING`. Inngest extracts or scrapes, chunks, embeds, then sets `COMPLETED` or `FAILED`. The open workspace refreshes that status while any row is still in progress |
| Chat | Create a thread, load its messages, stream a reply with citations, and delete the thread |
| Learn | Saved artifact titles, types, and statuses load with the workspace. Nothing generates them yet |

The Next.js app talks to the Express API with `credentials: "include"`. Auth, workspaces, sources, passage search, and chat all go through that API.

Opening Mosaic loads the first page of workspaces (50) and, when the account has more, the rest in the background. An account with no workspace gets one named **My Mosaic**. The app then opens the most recently updated workspace.

---

## API

Envelope: `{ success: true, result }` or `{ success: false, error }`.

Authenticated routes read the `token` cookie (`httpOnly`, `sameSite: "lax"`, `secure` in production). CORS allows `http://localhost:3000` with credentials.

### Public

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Liveness (`"HEALTH: OK"`) |
| `POST` | `/api/auth/register` | Create a user and set the cookie |
| `POST` | `/api/auth/login` | Check the password and set the cookie |
| `POST` | `/api/auth/logout` | Clear the cookie |

Register and login body: `email`, `password` (minimum 8). Register may also send `firstName` and `lastName`.

Inngest calls `POST /api/inngest` (not behind `requireAuth`). That path is for the Inngest Dev Server / cloud, not for the browser.

### Signed in

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/user/me` | Current profile. `401` when the cookie is missing or expired |

### Workspaces

All of these require the auth cookie. List and read include any workspace the user belongs to. Rename, model changes, and delete succeed for the owner.

| Method | Path | Body / query |
|--------|------|----------------|
| `POST` | `/api/workspace/create` | `{ name, defaultModel }` |
| `GET` | `/api/workspace` | `limit` (1–50, default 10), `offset` (default 0) |
| `GET` | `/api/workspace/:workspaceId` | — |
| `PUT` | `/api/workspace/:workspaceId` | `{ name? }` and/or `{ defaultModel? }` |
| `DELETE` | `/api/workspace/:workspaceId` | — |

`defaultModel` is `gpt-4o-mini` or `gpt-4o` (`CHAT_MODELS` in `server/src/lib/ai-config.ts`). The client sends `gpt-4o-mini` when creating a workspace unless the owner picks the other model.

List result:

```json
{ "workspaces": [{ "id": "", "name": "", "ownerId": "" }], "limit": 50, "offset": 0, "hasMore": false }
```

Workspace detail includes `defaultModel`, `users`, `sources`, `chats`, and `artifacts`. Chat rows are `{ id, title }`. Artifact rows are `{ id, title, type, status }` and do not include generated content.

### Sources

Mounted at `/api/workspace/:workspaceId/source`. The caller must be a member of the workspace (the owner is added as a member on create). Invalid membership is `404`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/source` | List. Optional `q` (title contains), `type`, `status` |
| `POST` | `/source` | Create `TEXT` or `MARKDOWN`: `{ type, title, content }`. Enqueued for chunking |
| `POST` | `/source/import/website` | `{ url, title }`. Saves `PENDING` + URL; Firecrawl runs in the job |
| `POST` | `/source/import/youtube` | `{ url, title }`. Saves `PENDING` + watch URL; transcript runs in the job |
| `POST` | `/source/import/pdf` | Multipart field `file` plus `title`. PDF only, up to 50 MB, stored on Cloudinary as `raw` |
| `POST` | `/source/reprocess` | `{ sourceIds }` (1–10). Resets found rows to `PENDING` and enqueues again. Unknown ids are ignored. The client chunks larger selections |
| `POST` | `/source/search` | `{ query, sourceIds? }`. Embeds the query and returns the top passage hits (`chunkId`, `sourceId`, `sourceTitle`, `index`, `page`, `snippet`, `score`) |
| `GET` | `/source/:sourceId` | Detail: `source`, `url`, `fileUrl`, `metadata`, `error` |
| `DELETE` | `/source/:sourceId` | Delete the row and, when present, the Cloudinary file |
| `POST` | `/source/bulk-delete` | `{ sourceIds }` with 1–10 ids. The client chunks larger selections |

Create/import returns `201` with `{ id, title, type, status, error }`. `status` is `PENDING` and `source` is filled later (except TEXT/MARKDOWN, which already store `content` and still go through the job for chunks). `error` is set when a job fails for good.

`SourceType`: `PDF`, `WEBSITE`, `YOUTUBE`, `TEXT`, `MARKDOWN`.

`SourceStatus`: `PENDING` → `PROCESSING` → `COMPLETED` or `FAILED`.

A web-search payload schema still exists. There is no route for it.

### Chats

Mounted at `/api/workspace/:workspaceId/chat`. Same membership check as sources.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/chat` | Threads for the workspace: `{ id, title, updatedAt }`, newest first |
| `POST` | `/chat` | `{ title? }` (default `"New Chat"`, max 200). Returns the new thread |
| `GET` | `/chat/:chatId` | Thread plus messages in time order |
| `DELETE` | `/chat/:chatId` | Delete the thread and its messages |
| `POST` | `/chat/:chatId/messages` | `{ content, sourceIds? }`. `content` is 1–8000 characters. Responds with server-sent events |

The message stream is `text/event-stream`. Each event is `event: <type>` and one JSON `data` line:

| Event | Data |
|-------|------|
| `user` | `{ message }` saved user turn |
| `citations` | `{ citations }` passage hits used for the reply |
| `token` | `{ text }` next piece of the answer |
| `done` | `{ message }` saved assistant turn, including citations |
| `error` | `{ message }` if the reply fails after the stream has started |

A failure before the stream starts is the normal JSON error envelope. Dates arrive as ISO strings.

Workspace detail still includes chat titles (`{ id, title }`) and artifact summaries. Message bodies come from the chat detail route, not from the workspace payload.

---

## Ingest

`inngest.send({ name: "source/process.requested", data: { sourceId, workspaceId } })` after every create/import (and after reprocess). `process-source` listens for that event.

| Type | Job |
|------|-----|
| PDF | Download from Cloudinary, extract with unpdf, `chunkPages` (keeps `metadata.page`) |
| WEBSITE | Firecrawl scrape → markdown, `chunkText` |
| YOUTUBE | `youtube-transcript`, `chunkText` |
| TEXT / MARKDOWN | Use stored `source`, `chunkText` |

Then `replaceSourceChunks` (delete existing slices + `createMany` in one transaction), embed with `text-embedding-3-small` (1536 dimensions, stored on `SourceChunk.embedding` with an HNSW cosine index), and `completeSource`. Empty extract/transcript/chunks, missing captions, or a permanent embedding failure set `FAILED` and store `error`. Download/scrape blips retry (up to 3).

Chunking lives in `server/src/lib/chunking.ts`. Defaults in `ai-config.ts`: `CHUNK_SIZE` 1000 characters, `CHUNK_OVERLAP` 100, `RAG_TOP_K` 6, `RAG_MIN_SCORE` 0.5. Chat keeps a short summary every `CONVERSATION_SUMMARY_INTERVAL` older turns and sends the last `RECENT_MESSAGE_WINDOW` messages with the question.

---

## Data model

`server/prisma/schema.prisma` is migrated. Artifact generation is the main write path still missing from HTTP.

```
User
  ├── ownedWorkspaces
  └── workspaces (members)

Workspace
  ├── owner, members, defaultModel
  ├── sources, chats, artifacts

Chat
  ├── summary, summaryMessageCount
  └── messages (role, content, citations)

Source
  ├── source (full text), url, fileUrl, metadata, error
  └── chunks (index, content, metadata, embedding vector(1536))

LearningArtifact
  └── type, status, title, content, sourceIds
```

`LearningArtifact` exists in Postgres. Workspace detail returns artifact summaries only. There is no artifact-write API.

---

## Frontend

`client/` is a Next.js app. API calls live in `client/src/services/` and keep the cookie on every request. `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8080`. If the API `PORT` is not 8080, set this to match.

| UI | Calls |
|----|--------|
| Auth modal | `POST /api/auth/register`, `POST /api/auth/login` |
| Session | `GET /api/user/me` once, shared if several components ask together |
| Log out | `POST /api/auth/logout` |
| Workspace switcher | list, create, get, update, delete |
| Upload | PDF import (two at a time), website and YouTube import, text/Markdown create, detail on open, single delete, bulk delete and reprocess in batches of 10, title list, passage search on submit |
| Chat | List once per workspace, open one thread, create on the first question, stream the reply, delete |

A few choices keep this from doing extra work:

- Workspace detail is cached per id and updated in place after a create, delete, or reprocess, instead of reloading the whole workspace.
- Leaving a workspace aborts its in-flight detail request.
- Title search filters the sources already on screen immediately, then confirms with the list endpoint after a short pause. The previous search is cancelled.
- Passage search runs only when you submit. It is an embedding call, so it does not run on each keystroke.
- While any source is `PENDING` or `PROCESSING`, the open workspace refetches the source list every 4 seconds, and skips that tick when the tab is hidden. The poll stops when every row is `COMPLETED` or `FAILED`.
- Chat messages load when a thread is opened, and stay in memory if you leave and come back. Tokens are painted once per frame, not once per network chunk.
- Switching threads or workspaces aborts the reply stream.
- PDF bytes are checked in the browser (type and 50 MB) before the upload request.
- File uploads omit `Content-Type` so the browser can set the multipart boundary.
- Source preview text is capped in the page, and the detail request runs only after a row is opened.

Learn has no generate API, so that screen only shows artifacts the workspace payload already includes.

---

## Still to build

1. **Learn.** Generate summaries, takeaways, flashcards, quizzes, mind maps, and reports, then return their content. The UI can show title, type, and status.
2. **Sharing.** Invite members. The membership relation exists; the product UI is owner-only for rename, model, and delete.
3. **Query-time extras.** Saving a web-search result as a source, and any cross-chat memory beyond the thread summary.
4. **Hardening.** Rate limits. Ingest errors already come back on `Source.error` and show on the source row.

---

## Run locally

Postgres from `server/docker-compose.yml` (user `mosaic`, database `mosaicdb`, port `5432`).

You need **three** processes: API, Inngest Dev Server, and the Next.js app.

```bash
cd server
npm install
npx prisma migrate dev
npm run dev
```

Second terminal, also in `server/` (start this after the API is listening):

```bash
npm run inngest:dev
```

That CLI points at `http://localhost:9090/api/inngest`. If your `PORT` is not `9090`, change the script or pass `-u http://localhost:<PORT>/api/inngest`. UI: [http://localhost:8288](http://localhost:8288).

```bash
cd client
npm install
npm run dev
```

The API default port is `8080` (`PORT` in `server/.env` overrides it). The site listens on port `3000`. That origin is the one the API allows.

After a PDF/website/YouTube/text import you should see `source/process.requested` in the Inngest UI, then `SourceChunk` rows in Prisma Studio (`npx prisma studio` from `server/`).

---

## Environment

**Server, required at boot:** `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

**Server, required for website import:** `FIRECRAWL_API_KEY`.

**Server, required for embeddings and chat replies:** `OPENAI_API_KEY`.

**Server, optional:** `PORT` (default `8080`), `JWT_EXPIRES_IN` (days, default `7`), `NODE_ENV` (`production` sets a secure cookie). Local Inngest uses `isDev` when `NODE_ENV` is not `production`; you do not need `INNGEST_EVENT_KEY` locally. Production needs `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.

Cloudinary’s `CLOUDINARY_URL` is not read. Use the three separate vars. The part after `@` in that URL is the cloud name.

**Client, optional:** `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`).

---

## Repo

```
mosaic-research/
  README.md
  server/     Express, Prisma, auth, workspaces, sources, chat, Inngest ingest
  client/     Next.js workspace UI
```

Server code is layered route → service → repository. Helpers live in `server/src/lib/` (Cloudinary, Firecrawl, PDF, YouTube, chunking, embeddings, OpenAI, Inngest client). The process job is `server/src/inngest/process-source.ts`. Chat routes live in `server/src/modules/chat/`.

---

## Security

- Workspace reads, source routes, and chat routes require membership (`404` if the user is not a member).
- Workspace rename, model changes, and delete are limited to the owner.
- Responses omit `passwordHash`.
- Passwords are hashed with Argon2id.
- The auth cookie is `httpOnly`. The browser clears it by calling `POST /api/auth/logout`.
- PDF upload runs only after the membership check. A failed database write deletes the Cloudinary file.
- `/api/inngest` is unauthenticated by design; Inngest signs requests in production.
- Source links in the UI are rendered only for `http` and `https` URLs.
