# Mosaic Research

A private study workspace. Sign in, open a workspace, and keep sources next to the questions you want to ask about them. Each workspace belongs to its owner and can include other members.

Ingest is in place: PDFs, websites, YouTube, and typed notes are stored, processed in the background, chunked, and marked `COMPLETED` or `FAILED`. Chat replies, retrieval over those chunks, and generated study artifacts are still ahead.

---

## What works today

| Surface | Behavior |
|---------|----------|
| Account | Register, log in, log out, and restore the session from the auth cookie |
| Workspaces | List, open, create, rename, delete, and set the default model (`gpt-4o-mini` or `gpt-4o`) |
| Sources | Add a PDF, import a website or YouTube URL, save text or Markdown, search, preview, refresh, reprocess, and delete |
| Ingest | After create/import, a row is `PENDING`. Inngest extracts or scrapes, writes `SourceChunk` rows, then sets `COMPLETED` or `FAILED` |
| Chat | Saved thread titles load with the workspace. The composer keeps what you type in the tab only. No chat API yet |
| Learn | Saved artifact titles, types, and statuses load with the workspace. Nothing generates them yet |

The Next.js app talks to the Express API with `credentials: "include"`. The client covers auth, workspaces, and most source actions. YouTube import and reprocess exist on the server only so far.

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
| `POST` | `/source/reprocess` | `{ sourceIds }` (1–10). Resets found rows to `PENDING` and enqueues again. Unknown ids are ignored |
| `GET` | `/source/:sourceId` | Detail: `source`, `url`, `fileUrl`, `metadata` |
| `DELETE` | `/source/:sourceId` | Delete the row and, when present, the Cloudinary file |
| `POST` | `/source/bulk-delete` | `{ sourceIds }` with 1–10 ids. The client chunks larger selections |

Create/import returns `201` with `{ id, title, type, status }`. `status` is `PENDING` and `source` is filled later (except TEXT/MARKDOWN, which already store `content` and still go through the job for chunks).

`SourceType`: `PDF`, `WEBSITE`, `YOUTUBE`, `TEXT`, `MARKDOWN`.

`SourceStatus`: `PENDING` → `PROCESSING` → `COMPLETED` or `FAILED`.

A web-search payload schema still exists. There is no route for it.

---

## Ingest

`inngest.send({ name: "source/process.requested", data: { sourceId, workspaceId } })` after every create/import (and after reprocess). `process-source` listens for that event.

| Type | Job |
|------|-----|
| PDF | Download from Cloudinary, extract with unpdf, `chunkPages` (keeps `metadata.page`) |
| WEBSITE | Firecrawl scrape → markdown, `chunkText` |
| YOUTUBE | `youtube-transcript`, `chunkText` |
| TEXT / MARKDOWN | Use stored `source`, `chunkText` |

Then `replaceSourceChunks` (delete existing slices + `createMany` in one transaction) and `completeSource`. Empty extract/transcript/chunks or missing captions fail permanently (`FAILED`). Download/scrape blips retry (up to 3).

Chunking lives in `server/src/lib/chunking.ts`. Defaults in `ai-config.ts`: `CHUNK_SIZE` 1000 characters, `CHUNK_OVERLAP` 100. Embeddings are not written yet.

---

## Data model

`server/prisma/schema.prisma` is migrated. Chat and artifact **write** APIs are still ahead of the HTTP layer.

```
User
  ├── ownedWorkspaces
  └── workspaces (members)

Workspace
  ├── owner, members, defaultModel
  ├── sources, chats, artifacts

Chat
  └── messages

Source
  ├── source (full text), url, fileUrl, metadata
  └── chunks (index, content, metadata; no embedding column yet)

LearningArtifact
  └── type, status, title, content, sourceIds
```

`Message` and `LearningArtifact` exist in Postgres. Workspace detail returns chat titles and artifact summaries only. There is no message or artifact-write API.

---

## Frontend

`client/` is a Next.js app. API calls live in `client/src/services/` and keep the cookie on every request. `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8080`. If the API `PORT` is not 8080, set this to match.

| UI | Calls |
|----|--------|
| Auth modal | `POST /api/auth/register`, `POST /api/auth/login` |
| Session | `GET /api/user/me` once, shared if several components ask together |
| Log out | `POST /api/auth/logout` |
| Workspace switcher | list, create, get, update, delete |
| Upload | PDF import (two at a time), website import, text/Markdown create, detail on open, single delete, bulk delete in batches of 10, list for search and refresh |

A few choices keep this from doing extra work:

- Workspace detail is cached per id and updated in place after a create or delete, instead of reloading the whole workspace.
- Leaving a workspace aborts its in-flight detail request.
- Search filters the sources already on screen immediately, then confirms with the list endpoint after a short pause. The previous search is cancelled.
- PDF bytes are checked in the browser (type and 50 MB) before the upload request.
- File uploads omit `Content-Type` so the browser can set the multipart boundary.
- Source preview text is capped in the page, and the detail request runs only after a row is opened.

Chat questions and Learn generation have no API, so those screens do not pretend to save or produce them. The UI does not call YouTube import or reprocess yet.

---

## Still to build

1. **Chat.** Create threads, store messages, stub then real model replies. Schema has `Chat` and `Message`. The UI can list titles only.
2. **Retrieval.** Embed `SourceChunk.content` with `text-embedding-3-small` (1536 dims), search top `RAG_TOP_K`, put citations on `Message.citations`.
3. **Learn.** Generate summaries, takeaways, flashcards, quizzes, mind maps, and reports (same Inngest shape as sources). The UI can show title, type, and status.
4. **Sharing.** Invite members. The membership relation exists; the product UI is owner-only for rename, model, and delete.
5. **Query-time extras.** Web search and cross-chat memory, if those providers are added.
6. **Hardening.** Rate limits, and a place to show ingest errors on a source.
7. **Client parity.** YouTube import and reprocess buttons.

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

**Server, optional:** `PORT` (default `8080`), `JWT_EXPIRES_IN` (days, default `7`), `NODE_ENV` (`production` sets a secure cookie). Local Inngest uses `isDev` when `NODE_ENV` is not `production`; you do not need `INNGEST_EVENT_KEY` locally. Production needs `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.

Cloudinary’s `CLOUDINARY_URL` is not read. Use the three separate vars. The part after `@` in that URL is the cloud name.

**Client, optional:** `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`).

---

## Repo

```
mosaic-research/
  README.md
  server/     Express, Prisma, auth, workspaces, sources, Inngest ingest
  client/     Next.js workspace UI
```

Server code is layered route → service → repository. Helpers live in `server/src/lib/` (Cloudinary, Firecrawl, PDF, YouTube, chunking, Inngest client). The process job is `server/src/inngest/process-source.ts`.

---

## Security

- Workspace reads and source routes require membership (`404` if the user is not a member).
- Workspace rename, model changes, and delete are limited to the owner.
- Responses omit `passwordHash`.
- Passwords are hashed with Argon2id.
- The auth cookie is `httpOnly`. The browser clears it by calling `POST /api/auth/logout`.
- PDF upload runs only after the membership check. A failed database write deletes the Cloudinary file.
- `/api/inngest` is unauthenticated by design; Inngest signs requests in production.
- Source links in the UI are rendered only for `http` and `https` URLs.
