# FAsset TaskBounty Frontend

Static Next.js + TypeScript dashboard for the live TaskBounty V2 deployment on
Flare Testnet Coston2.

**Live site:** <https://fasset-taskbounty.pages.dev/>

## Current read-only milestone

The browser connects directly to the public Coston2 RPC and displays:

1. Chain ID and latest observed block.
2. TaskBounty `VERSION()`, `nextTaskId()` and `totalEscrowed()`.
3. V2 Task #1 creator, worker, reward, status and URI/hash commitments.
4. Current Creator, TaskBounty and Worker FTestXRP balances.
5. Exact-byte Keccak-256 verification of both version-pinned GitHub artifacts.
6. Explicit V1/V2 deployment-to-ABI mapping.

No wallet, private key, keystore, signature, paid RPC key or backend is needed
for this milestone.

## Stack

- Next.js `16.2.10` App Router
- React `19.2.4`
- TypeScript `5.9.3`
- Viem `2.55.2`
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

The first production deployment completed on 2026-07-17 from commit
`b782ded86a9a184fe8b4f16c41f301b0eb78af2f`. Public verification reproduced
the completed Task #1 state, 8/0/2 FTestXRP balances, both exact-byte hash
matches, a working refresh, and no browser console errors or warnings.

See [`../docs/frontend-hosting.md`](../docs/frontend-hosting.md) for the free
hosting comparison and migration boundaries.

## Security boundary

- The frontend only uses public `eth_call`/block reads in this milestone.
- Artifact verification hashes `Uint8Array` bytes returned by `arrayBuffer()`;
  it does not hash the URI string or parsed JSON.
- The CSP only permits RPC calls to the official Coston2 endpoint and artifact
  retrieval from `raw.githubusercontent.com`.
- Future write actions must use an injected wallet and show a user confirmation
  prompt. Private keys and keystore passwords never belong in frontend code or
  deployment environment variables.
