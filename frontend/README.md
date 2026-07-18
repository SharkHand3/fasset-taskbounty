# FAsset TaskBounty Frontend

Static Next.js + TypeScript dashboard for the live TaskBounty V2 deployment on
Flare Testnet Coston2.

**Live site:** <https://fasset-taskbounty.pages.dev/>

## Current public-read, wallet-identity and exact-approval milestone

The browser connects directly to the public Coston2 RPC and displays:

1. Chain ID and latest observed block.
2. TaskBounty `VERSION()`, `nextTaskId()` and `totalEscrowed()`.
3. V2 Task #1 creator, worker, reward, status and URI/hash commitments.
4. Current Creator, TaskBounty and Worker FTestXRP balances.
5. Exact-byte Keccak-256 verification of both version-pinned GitHub artifacts.
6. Explicit V1/V2 deployment-to-ABI mapping.
7. Optional injected EIP-1193 wallet detection and connection.
8. Connected address, active network, Task #1 role, C2FLR and FTestXRP balance.
9. Creator-to-TaskBounty V2 allowance read through the public Coston2 RPC.
10. An exact `1 FTestXRP` ERC-20 `approve` simulation and gas estimate.
11. Explicit transaction-intent review before MetaMask can be opened.
12. Receipt, `Approval` event and refreshed-allowance verification after broadcast.

The public dashboard does not need a wallet. Connecting a browser wallet only
grants the site access to the selected public address and active chain. The
only enabled write milestone is an exact `approve(TaskBounty V2, 1_000_000)`
from the dedicated Creator account on chain `114`. It transfers no token and
does not create Task #2. Simulation is public and gas-free; only the later
MetaMask confirmation can broadcast and spend C2FLR gas. A private key,
recovery phrase or keystore password must never be entered into the page.

## Stack

- Next.js `16.2.10` App Router
- React `19.2.4`
- TypeScript `5.9.3`
- Viem `2.55.2`
- Wagmi `3.7.3`
- TanStack Query `5.101.2`
- Vitest `4.1.10`
- Static export via `output: "export"`

Direct dependency versions are pinned and `package-lock.json` is committed.
The PostCSS transitive dependency is overridden to `8.5.19` to avoid the
advisory affecting the version bundled by Next.js.

## Git Bash commands

```bash
cd /d/web3/web3-taskbounty/frontend
npm ci
npm run dev
```

Open `http://localhost:3000`.

Run every quality gate:

```bash
npm run check
```

This executes ESLint, TypeScript, Vitest and the production static build. The
build output is generated in `frontend/out/`.

## Deployment configuration

The selected free host is **Cloudflare Pages**. Connect the GitHub repository
and use:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | `frontend` |
| Framework preset | `None` (manual static-export settings) |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node version | read from `.node-version` (`22.16.0`) |

Every push to `main` will rebuild the static dashboard. Pull requests can use
preview deployments. No environment variables are required; the RPC URL,
testnet addresses and ABI versions are public configuration.

Injected wallets work in a static deployment because the wallet extension
adds an EIP-1193 provider to the user's browser. Cloudflare serves only the
HTML, CSS and JavaScript; it never receives the wallet secret or signs a
transaction. If no compatible wallet is detected, the page stays fully usable
for public reads and shows links to the official MetaMask and Rabby sites.

The first production deployment completed on 2026-07-17 from commit
`b782ded86a9a184fe8b4f16c41f301b0eb78af2f`. Public verification reproduced
the completed Task #1 state, 8/0/2 FTestXRP balances, both exact-byte hash
matches, a working refresh, and no browser console errors or warnings.

See [`../docs/frontend-hosting.md`](../docs/frontend-hosting.md) for the free
hosting comparison and migration boundaries. See
[`../docs/frontend-approval-flow.md`](../docs/frontend-approval-flow.md) for
the exact write guards, browser-to-chain sequence and reproducible pre-sign
public checks.

## Security boundary

- Public task data uses `eth_call`/block reads and remains wallet-free.
- Wallet connection exposes a selected public address and chain ID only.
- Coston2 balance reads use the configured public Wagmi/Viem transport rather
  than asking the wallet to sign or send anything.
- The approval control requires the Creator role, Coston2, a sufficient token
  balance, an exact amount, a successful simulation returning `true`, a gas
  estimate and a per-intent review checkbox.
- Account, chain or allowance changes invalidate the simulated/reviewed intent.
- The write sends the request returned by `useSimulateContract`; it never asks
  for an unlimited allowance and never handles a raw private key.
- Post-broadcast success checks the receipt, exact `Approval` event and a fresh
  public allowance read.
- Artifact verification hashes `Uint8Array` bytes returned by `arrayBuffer()`;
  it does not hash the URI string or parsed JSON.
- The CSP only permits RPC calls to the official Coston2 endpoint and artifact
  retrieval from `raw.githubusercontent.com`.
- Every later write action must follow the same simulate, review, wallet
  confirmation, receipt and public-read verification boundary. Private keys,
  recovery phrases and keystore passwords never belong in frontend code or
  deployment environment variables.
