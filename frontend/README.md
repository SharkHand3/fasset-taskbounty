# FAsset TaskBounty Frontend

Static Next.js + TypeScript product for the live TaskBounty V2 deployment on
Flare Testnet Coston2.

**Live site:** <https://fasset-taskbounty.pages.dev/>

## Product routes

| Route | Purpose |
|---|---|
| `/` | Product landing page and live protocol overview |
| `/tasks/` | Recent-task marketplace with status filters |
| `/tasks/view/?id=N` | Generic task detail, exact-byte verification, dynamic role, and lifecycle action |
| `/tasks/new/` | Deterministic brief generation, exact approval, and funded task creation |
| `/lab/` | Fixed Task #1/Task #2 QA fixtures retained for regression testing |

The marketplace and detail pages do not require a wallet. Connecting an
injected wallet exposes only the selected public address and active chain. The
product derives creator, assigned worker, or participant role separately for
each live task and exposes only the action allowed by the current contract
state. Every write is gated by public-RPC simulation and explicit intent
review, then verified against the expected receipt event. A private key,
recovery phrase, keystore file, or wallet password must never be entered into
the page.

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

See [`../docs/product-architecture.md`](../docs/product-architecture.md) for
the route boundaries, trust model, and beta limitations. The older
[`../docs/frontend-approval-flow.md`](../docs/frontend-approval-flow.md) and
[`../docs/frontend-task-creation-flow.md`](../docs/frontend-task-creation-flow.md)
describe the deterministic fixtures now isolated in `/lab/`.

## Security boundary

- Public task data uses `eth_call`/block reads and remains wallet-free.
- Wallet connection exposes a selected public address and chain ID only.
- Coston2 balance reads use the configured public Wagmi/Viem transport rather
  than asking the wallet to sign or send anything.
- Generic task creation requires Coston2, a sufficient token balance, an exact
  selected allowance, a verified manifest, a predicted live `nextTaskId`, gas
  estimation, and a per-intent review checkbox.
- Account, chain, allowance, task state, reward, URI, or hash changes invalidate
  the corresponding simulated/reviewed intent.
- Lifecycle controls derive authorization from live task status and participant
  addresses, then simulate `acceptTask`, `submitWork`, `approveTask`, or
  `cancelTask` before opening the wallet.
- Writes use requests returned by `useSimulateContract`; the app never asks for
  an unlimited allowance and never handles a raw private key.
- Post-broadcast success decodes the action-specific contract event and refreshes
  the relevant public state.
- Artifact verification hashes `Uint8Array` bytes returned by `arrayBuffer()`;
  it does not hash the URI string or parsed JSON.
- Artifact fetches accept IPFS, Arweave, and version-pinned GitHub Raw URIs;
  the CSP permits only their configured HTTPS gateways plus the official RPC.
- Every later write action must follow the same simulate, review, wallet
  confirmation, receipt and public-read verification boundary. Private keys,
  recovery phrases and keystore passwords never belong in frontend code or
  deployment environment variables.
