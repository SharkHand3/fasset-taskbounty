# TaskBounty read API and event indexer

Cloudflare Worker + D1 read layer for the TaskBounty V2 deployment on Flare
Testnet Coston2. It never signs transactions and never handles wallet secrets.

**Production API:**
<https://fasset-taskbounty-api.zyf291436865.workers.dev>

## Responsibilities

- Poll the five TaskBounty lifecycle events from deployment block `32928923`.
- Project them idempotently into query-friendly task rows.
- Keep a durable checkpoint and confirmed-chain protocol snapshot.
- Verify allowlisted task/result artifacts against their on-chain Keccak-256
  commitments with bounded downloads.
- Serve versioned, paginated, read-only JSON endpoints.

## API

| Endpoint | Purpose |
|---|---|
| `GET /v1/health` | Synchronization health and lag |
| `GET /v1/protocol` | Deployment and confirmed protocol snapshot |
| `GET /v1/tasks` | Cursor-paginated tasks with optional status/participant filters |
| `GET /v1/tasks/:id` | One task, artifact integrity, and lifecycle event timeline |

Task IDs and token amounts are serialized as decimal strings so JavaScript
clients do not lose integer precision.

## Git Bash commands

```bash
cd /d/web3/web3-taskbounty/backend
npm ci
npm run check
npm run verify:production
npm run db:migrate:local
npm run dev
```

`verify:production` reads the production API, then reads `VERSION()`,
`nextTaskId()`, `totalEscrowed()`, and `getTask(1)` from the public Coston2 RPC
at the API's exact confirmed snapshot block. It fails if protocol identity,
task state, or artifact integrity diverges. It requires no wallet or secret.

For a local scheduled sync, start the Worker with `npm run dev:scheduled`, then
open `http://127.0.0.1:8787/__scheduled` in another Git Bash window.

Remote deployment uses a free Cloudflare Worker, one D1 database, and a
one-minute Cron Trigger. Create the remote database before replacing the local
placeholder `database_id` in `wrangler.jsonc`.

The production database is already configured. Future schema changes must be
added as a new numbered file in `migrations/`; never rewrite an already-applied
migration.

## Safety and consistency model

- Only blocks behind the configured confirmation depth are indexed.
- Every log is uniquely keyed by transaction hash plus log index.
- Projection writes and checkpoint advancement share one D1 batch per range.
- Each invocation processes at most eight ranges and eight lifecycle events so
  the free-plan query/subrequest budgets remain bounded. A busy range fails
  closed and can be retried with a smaller `LOG_CHUNK_SIZE`.
- A lease prevents overlapping Cron invocations from running the same sync.
- The API never performs a chain write and exposes no administrative sync route.
- Artifact retrieval accepts only IPFS, Arweave, and commit-pinned GitHub Raw
  URIs; it is limited to 1 MiB and 15 seconds.
- The frontend retains a direct public-RPC fallback because D1 is a query cache,
  not the settlement source of truth.
