# Frontend Hosting Decision

## Decision

Use **Cloudflare Pages Free** for the first public TaskBounty frontend.

The current frontend is a Next.js static export. All live blockchain reads and
artifact verification happen in the browser, so paying for a Node.js server or
serverless functions would add cost and operational complexity without adding
value to this milestone.

## Why Cloudflare Pages

As documented in July 2026, the Pages Free plan includes 500 builds per month,
one concurrent build, up to 20,000 files per site, a 25 MiB individual-file
limit, preview deployments and custom-domain support. The TaskBounty export is
far below these limits.

Cloudflare's official static Next.js preset uses:

```text
Build command:    npx next build
Output directory: out
```

This repository uses the equivalent `npm run build` command. The frontend
contains `.node-version` because Cloudflare Pages supports that file for
selecting Node.js in its build image.

Official references:

- <https://developers.cloudflare.com/pages/platform/limits/>
- <https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/>
- <https://developers.cloudflare.com/pages/configuration/build-configuration/>
- <https://developers.cloudflare.com/pages/configuration/build-image/>

## Alternatives considered

### Vercel Hobby

Vercel is the easiest zero-configuration Next.js host and its Hobby plan is
free. It includes Git integration, automatic HTTPS and preview deployments.
However, Hobby is intended for personal and non-commercial use. It remains a
good fallback for this learning portfolio, but a future commercial TaskBounty
would need a plan review or migration.

References:

- <https://vercel.com/docs/plans>
- <https://vercel.com/docs/frameworks/full-stack/nextjs>
- <https://vercel.com/pricing>

### GitHub Pages

GitHub Pages is available for public repositories on GitHub Free and could host
the static export. It was not selected because its product rules say Pages is
not intended to host an online business or commercial SaaS, and repository
subpath routing adds configuration that does not help the current learning
goal.

Reference:

- <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>

## Deployment settings

| Cloudflare Pages field | Value |
|---|---|
| Git repository | `SharkHand3/fasset-taskbounty` |
| Production branch | `main` |
| Root directory | `frontend` |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Build output directory | `out` |

No secrets are required. `NEXT_PUBLIC_COSTON2_RPC_URL` is supported as an
optional build-time override, but the default official public RPC is already
compiled into the frontend.

## Migration boundary

Static Pages hosting is sufficient for:

- public RPC reads;
- injected-wallet transactions;
- local transaction-state handling;
- exact-byte artifact fetching and hash verification;
- explorer links and portfolio pages.

Move server-side work to a separate backend/Indexer when the project needs:

- durable event synchronization checkpoints;
- PostgreSQL task/event queries;
- rate limiting or authenticated APIs;
- server-held provider credentials;
- scheduled reconciliation and completion-record generation.

The browser frontend must never become a place to store private keys, keystore
passwords or backend secrets.
