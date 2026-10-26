# Mosaic Research

A private study workspace. Sign in, open a workspace, and keep sources next to the questions you want to ask about them. Each workspace belongs to its owner and can include other members. Chat replies, retrieval, and generated study artifacts are still ahead.

---

## What works today

| Surface | Behavior |
|---------|----------|
| Account | Register, log in, log out, and restore the session from the auth cookie |
| Workspaces | List, open, create, rename, delete, and set the default model (`gpt-4o-mini` or `gpt-4o`) |
| Sources | Add a PDF, import a website, save text or Markdown, search, preview, refresh, and delete |
| Chat | Saved thread titles load with the workspace. The composer keeps what you type in the tab only |
| Learn | Saved artifact titles, types, and statuses load with the workspace. Nothing generates them yet |

The Next.js app talks to the Express API with `credentials: "include"`. The server was left unchanged; the client matches the routes that already exist.

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

`defaultModel` is `gpt-4o-mini` or `gpt-4o`. The client sends `gpt-4o-mini` when creating a workspace unless the owner picks the other model.

List result:

```json
{ "workspaces": [{ "id": "", "name": "", "ownerId": "" }], "limit": 50, "offset": 0, "hasMore": false }
```

Workspace detail includes `defaultModel`, `users`, `sources`, `chats`, and `artifacts`. Chat rows are `{ id, title }`. Artifact rows are `{ id, title, type, status }` and do not include generated content.

### Sources

Mounted at `/api/workspace/:workspaceId/source`. The caller must be a member of the workspace (the owner is added as a member on create).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/source` | List. Optional `q` (title contains), `type`, `status` |
| `POST` | `/source` | Create `TEXT` or `MARKDOWN`: `{ type, title, content }` |
| `POST` | `/source/import/website` | `{ url, title }`. Scrapes with Firecrawl and stores Markdown |
| `POST` | `/source/import/pdf` | Multipart field `file` plus `title`. PDF only, up to 50 MB, stored on Cloudinary |
| `GET` | `/source/:sourceId` | Detail: `source`, `url`, `fileUrl`, `metadata` |
| `DELETE` | `/source/:sourceId` | Delete the row and, when present, the Cloudinary file |
| `POST` | `/source/bulk-delete` | `{ sourceIds }` with 1–10 ids. The client chunks larger selections |

New sources are stored as `PENDING`. Nothing moves them to `PROCESSING`, `COMPLETED`, or `FAILED` yet.

`SourceType`: `PDF`, `WEBSITE`, `YOUTUBE`, `TEXT`, `MARKDOWN`.

`SourceStatus`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.

YouTube, reprocess, and web-search payloads exist as schemas only. There is no route for them.

---

## Data model

`server/prisma/schema.prisma` is migrated and is ahead of the HTTP API.

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
  ├── source (inline text), url, fileUrl, metadata
  └── chunks

LearningArtifact
  └── type, status, title, content, sourceIds
```

`Message`, `SourceChunk`, and `LearningArtifact` are in Postgres. Only artifact summaries are returned, on the workspace detail route. There is no message, chunk, or artifact-write API.

---

## Frontend

`client/` is a Next.js app. API calls live in `client/src/services/` and keep the cookie on every request. `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8080`.

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

Chat questions and Learn generation have no API, so those screens do not pretend to save or produce them.

---

## Still to build

1. **Ingest.** Extract text, chunk, embed, and mark each source `COMPLETED` or `FAILED`. `server/src/lib/pdf.ts` can read a stored PDF and is not called by a route. Website import already stores Firecrawl Markdown on the row. The processing enqueue in the source service is still a comment.
2. **YouTube.** Accept a video URL, store a transcript, and reuse the same source row.
3. **Chat.** Create threads, store messages, and answer from retrieved passages. The schema has `Chat` and `Message`. The UI can list titles only.
4. **Retrieval.** Embeddings, a vector index partitioned by workspace, and citations in the answer.
5. **Learn.** Generate summaries, takeaways, flashcards, quizzes, mind maps, and reports, then return their content. The UI can show title, type, and status.
6. **Sharing.** Invite members. The membership relation exists; the product UI is owner-only for rename, model, and delete.
7. **Query-time extras.** Web search and cross-chat memory, if those providers are added.
8. **Hardening.** Rate limits, and a place to show ingest errors on a source.

---

## Run locally

Postgres from `server/docker-compose.yml` (user `mosaic`, database `mosaicdb`, port `5432`).

```bash
cd server
npm install
npx prisma migrate dev
npm run dev
```

```bash
cd client
npm install
npm run dev
```

The API listens on port `8080`. The site listens on port `3000`. That origin is the one the API allows.

---

## Environment

**Server, required:** `DATABASE_URL`, `JWT_SECRET`.

**Server, required for the features that use them:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` for PDFs. `FIRECRAWL_API_KEY` for website import.

**Server, optional:** `PORT` (default `8080`), `JWT_EXPIRES_IN` (days, default `7`), `NODE_ENV` (`production` sets a secure cookie).

**Client, optional:** `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`).

---

## Repo

```
mosaic-research/
  README.md
  server/     Express, Prisma, auth, workspaces, sources
  client/     Next.js workspace UI
```

Server code is layered route → service → repository, with Cloudinary, Firecrawl, and the unused PDF helper in `server/src/lib/`.

---

## Security

- Workspace reads and source routes require membership.
- Workspace rename, model changes, and delete are limited to the owner in the query.
- Responses omit `passwordHash`.
- Passwords are hashed with Argon2id.
- The auth cookie is `httpOnly`. The browser clears it by calling `POST /api/auth/logout`.
- PDF upload runs only after the membership check. A failed database write deletes the Cloudinary file.
- Source links in the UI are rendered only for `http` and `https` URLs.
