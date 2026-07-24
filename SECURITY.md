# Security policy

## Supported scope

The current public release is a Coston2 testnet milestone. The repository does
not claim an independent security audit or mainnet readiness. Security reports
are still useful for the current `main` branch, especially for:

- token escrow accounting or unauthorized state transitions;
- reentrancy, event/receipt validation, or role-boundary failures;
- wallet-intent, chain-identity, or transaction-simulation bypasses;
- artifact retrieval, redirect, size, timeout, or hash-verification bypasses;
- read API identity validation, CORS, index integrity, or unsafe data handling;
- accidental exposure of credentials or wallet-secret material.

## Reporting a vulnerability

Do not publish an exploitable vulnerability or secret in a public issue. Use
the repository's **Security** tab to open a private vulnerability report or
security advisory:

<https://github.com/SharkHand3/fasset-taskbounty/security/advisories/new>

Include the affected commit, component, reproduction steps, impact, and any
suggested mitigation. Do not include real private keys, recovery phrases,
keystore passwords, API credentials, or mainnet funds in a reproduction.

## Operational boundary

- The live product and contract use Flare Testnet Coston2 and FTestXRP.
- The frontend and read API have no legitimate need for a private key.
- D1 is a rebuildable read model; Coston2 contract state is the settlement
  source of truth.
- Testnet deployment does not remove the need for review before handling assets
  with economic value.

## Current upstream build advisory

The frontend uses Next.js `16.2.11`, the active-LTS security release available
at the last review. Next declares Sharp `<0.35.0` as an optional dependency, and
the npm full-tree audit reports the inherited libvips advisory
`GHSA-f88m-g3jw-g9cj`. The current Next release does not accept the fixed Sharp
minor line, so forcing a different Next major or an unsupported Sharp override
would introduce a larger compatibility risk.

The deployed product is a static export (`output: "export"`) with Next image
optimization explicitly disabled. Cloudflare Pages receives only static HTML,
CSS, JavaScript, and image assets; it does not run the Next server or Sharp.
CI therefore audits non-optional production dependencies and separately builds
the exact static artifact. The team should remove this exception as soon as a
supported Next/Sharp pair is published. Any future move to server rendering or
runtime image optimization must treat this advisory as release-blocking.
