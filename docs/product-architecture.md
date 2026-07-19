# Product architecture

## Product decision

TaskBounty now separates customer-facing workflows from deterministic
integration fixtures. Numeric task IDs are normal protocol identifiers. What
does not belong in a product route is assuming that every visitor is the
creator of Task #1 or that the next operation must create Task #2.

## Route map

| Route | Responsibility |
|---|---|
| `/` | Product positioning and live protocol health |
| `/tasks/` | Recent bounty discovery and status filtering |
| `/tasks/view/?id=N` | Generic task detail, artifact verification, dynamic role, and lifecycle action |
| `/tasks/new/` | Generic brief creation, artifact verification, exact allowance, and escrow deposit |
| `/lab/` | Fixed Task #1/Task #2 regression fixtures and historical evidence |

The detail page uses a query parameter instead of a build-time `[id]` segment
because the current deployment is a static export. A static build cannot know
future on-chain task IDs. This keeps every future task addressable without
introducing a server solely for routing.

## Trust and custody boundaries

1. Public reads use the configured Coston2 RPC and require no wallet.
2. Rich briefs and results live off-chain, while exact UTF-8 bytes are bound to
   on-chain Keccak-256 commitments.
3. The frontend never receives a private key, recovery phrase, keystore, or
   wallet password.
4. Every write is simulated against public state before its wallet button is
   enabled.
5. The user reviews the exact intent, then the injected wallet independently
   displays and signs the transaction.
6. A transaction is reported as verified only after the expected contract
   event is decoded from its successful receipt.

## Generic lifecycle

```text
Creator: approve exact reward -> createTask -> [approveTask | cancelTask]
Participant: acceptTask -> becomes assigned Worker
Worker: submitWork with verified URI + hash
Creator: verify result -> approveTask -> reward released
```

Available controls are derived from the live task status and its creator and
worker addresses. No product action is authorized by a global hard-coded role.

## Current beta limitations

- Discovery reads a bounded recent window directly from RPC. A production
  marketplace needs an event indexer, database, pagination, search, and caching.
- Manifest generation is local. The current browser beta expects the downloaded
  exact bytes to be published to IPFS, Arweave, or a version-pinned GitHub Raw
  URL. A later artifact service can add managed object storage and automate
  upload without touching wallet secrets.
- The browser beta currently resolves `ipfs://` through `ipfs.io`, `ar://`
  through `arweave.net`, and permits version-pinned GitHub Raw HTTPS URLs. The
  allowlist limits untrusted tasks from turning visitors' browsers into an
  arbitrary cross-origin request client.
- The V2 contract intentionally has a minimal state machine. Deadlines,
  disputes, arbitration, milestones, reputation, moderation, and protocol fees
  are not yet implemented.
- The product is Coston2-only and uses FTestXRP. It is not a mainnet service.
- Direct browser RPC and artifact requests depend on provider availability and
  CORS. The future query API should provide resilient indexed reads while chain
  state remains the settlement source of truth.

## Why `/lab/` remains

Real teams keep deterministic fixtures, staging consoles, and QA dashboards.
The fixed Task #1 completion and unbroadcast Task #2 scenario remain useful for
regression testing, event decoding, and documentation. They are isolated from
the marketplace so test-specific assumptions cannot leak into customer flows.
