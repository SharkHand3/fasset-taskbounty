# Architecture

```text
Injected browser wallet
    |-- account/network discovery (EIP-1193)
    `-- user-reviewed signatures only
              |
              v
Next.js product -- Wagmi/Viem -- Flare Testnet Coston2
    |                              |-- FTestXRP ERC-20
    |                              `-- TaskBounty V2 escrow contract
    |                                      |-- task/result URI + hash
    |                                      |-- state + totalEscrowed
    |                                      `-- lifecycle events
    |
    | primary reads                         v
    `--------------------------- Versioned read API
                                      ^
                                      | Cloudflare D1 query projection
                                      ^
                                      | confirmed-event indexer
                                      `---- public Coston2 RPC / explorer aid

Off-chain artifact storage <------ exact-byte retrieval and Keccak-256 check
    |-- content-addressed IPFS / Arweave, or
    `-- version-pinned GitHub Raw URLs

Next.js product ------------------> direct public-RPC fallback
```

## Deployment surfaces

| Component | Environment | Status |
|---|---|---|
| Solidity contracts | Foundry / Coston2 | V1 retained; V2 deployed and Task #1 completed |
| Reward asset | Coston2 FTestXRP | Official address configured and used in the completed escrow |
| Frontend | [Next.js static export / Cloudflare Pages](https://fasset-taskbounty.pages.dev/) | Product routes for discovery, publishing, detail, and role-aware lifecycle actions; fixed scenarios isolated in `/lab/` |
| Backend/indexer | [Cloudflare Worker + D1](https://fasset-taskbounty-api.zyf291436865.workers.dev) | Deployed; confirmed-event indexer and versioned read API |
| Source and documentation | [GitHub](https://github.com/SharkHand3/fasset-taskbounty) | Published on `main` |
| Hackathon submission | DoraHacks BUIDL | Materials prepared; video and authenticated submission remain |

## V2 transaction and artifact flow

```text
Creator finalizes task manifest
  -> publishes version-pinned/content-addressed metadataURI
  -> computes metadataHash over exact bytes
  -> approves FTestXRP
  -> creates task and deposits the exact reward
  -> Worker accepts task
  -> Worker publishes an immutable result manifest
  -> Worker submits resultURI + resultHash
  -> Creator/frontend verifies the committed bytes
  -> Creator approves work
  -> TaskBounty transfers FTestXRP to worker
  -> Indexer projects confirmed events into the read model
```

The task manifest, worker result, and post-approval completion record are
separate artifacts. See [`artifact-integrity.md`](artifact-integrity.md) for
their schemas, hashing rules, and storage recommendations. The first public V2
completion record is
[`v2-completion-evidence.md`](v2-completion-evidence.md).

## Current product paths

```text
Product shell
  -> `/` live protocol overview and value proposition
  -> `/tasks/` cursor-paginated recent-task discovery through the read API
  -> `/tasks/view/?id=N` generic task detail and exact-byte artifact checks
  -> `/tasks/new/` generic manifest, exact approval, and funded creation flow
  -> `/lab/` fixed integration fixtures and historical regression controls

Public read path
  -> production read API -> confirmed D1 projection
       -> validate chain / address / version / numeric and hash shapes
  -> on API failure or identity mismatch -> official Coston2 RPC fallback
       -> VERSION / nextTaskId / totalEscrowed / getTask / ERC-20 balanceOf
  -> fetch allowlisted version-pinned or content-addressed artifact bytes
       -> Uint8Array -> Keccak-256
       -> compare with metadataHash / resultHash read from V2

Optional write path
  -> Wagmi injected connector discovers EIP-1193 providers
  -> user grants only account access and selects Coston2
  -> frontend derives creator/worker/participant role per live task
  -> product exposes only the action allowed by status + role
  -> public RPC simulates exact calldata before the wallet can open
  -> user reviews intent inside the page and independently in the wallet
  -> wallet signs and broadcasts without exposing private key material
  -> frontend waits for receipt, decodes the expected lifecycle event, and refreshes state
```

The address-to-ABI mapping is explicit: historical V1 and current V2 are
different deployments and are never decoded interchangeably. The browser
wallet keeps custody of all key material; neither the static bundle nor
Cloudflare receives a private key. ERC-20 `approve` changes allowance only; it
is distinct from TaskBounty `approveTask`, which completes submitted work and
pays the worker.

The contract is the settlement authority. D1 can be rebuilt from confirmed
events and must not be trusted as a second ledger. The frontend validates the
API identity and retains the public-RPC path as a safe fallback.

The hosting decision is documented in
[`frontend-hosting.md`](frontend-hosting.md). The deployed read boundary is
documented in [`read-layer-architecture.md`](read-layer-architecture.md).
Product route boundaries and beta limitations are documented in
[`product-architecture.md`](product-architecture.md).
