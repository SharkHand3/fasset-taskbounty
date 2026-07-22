# Human Proof product migration QA

## Release scope

This release migrates the approved **Human Proof** concept into the production
Next.js frontend. The migration changes presentation, motion, hierarchy, and
responsive behavior without changing the deployed contracts, ABI, wallet
authorization rules, D1 schema, indexer, or public-RPC fallback.

The landing page now uses real TaskBounty V2 protocol data in the concept's
proof ticket. Its completed settlement narrative is backed by Coston2 Task #1,
including the committed result hash and creator approval transaction. Product
routes keep their existing generic task and role behavior; fixed Task #1 and
Task #2 fixtures remain isolated in `/lab/`.

## Design fidelity review

- Preserved the selected concept's warm paper canvas, forest typography, coral
  action color, mint verification surface, proof seal, settlement trace, and
  editorial serif/sans contrast.
- Replaced concept-only sample values with live V2 reads and the verified Task
  #1 settlement record.
- Added a DPR-capped canvas proof field, scan, ticker, lifecycle, and reveal
  motion. `prefers-reduced-motion` disables non-essential animation.
- Kept public reads wallet-free and kept every write behind the existing
  simulation, review, role, network, and wallet-confirmation gates.

## Automated verification

| Layer | Verification | Result |
| --- | --- | --- |
| Frontend | ESLint | Pass |
| Frontend | TypeScript `tsc --noEmit` | Pass |
| Frontend | Vitest | 54 passed |
| Frontend | Next.js static production export | Pass; 6 product routes generated |
| Backend | ESLint and TypeScript | Pass |
| Backend | Vitest | 15 passed |
| Backend | Wrangler dry-run build | Pass |
| Contracts | Foundry | 11 passed, including 256 fuzz runs |
| Production read layer | D1/API versus public Coston2 snapshot | Pass at block 33,121,996 |

## Browser QA

QA was performed against the generated static export at 1440 x 1024 and
390 x 844.

| Surface | Checks | Result |
| --- | --- | --- |
| `/` | Live protocol totals, proof ticket, particle field, reveal/ticker motion, settlement evidence, CTA links | Pass |
| `/tasks/` | API/RPC load, completed Task #1, status filters, refresh-safe public reads | Pass |
| `/tasks/view/?id=1` | On-chain task, brief/result exact-byte verification, participant derivation, disconnected-wallet boundary | Pass |
| `/tasks/new/` | Responsive form, deterministic manifest generation, disabled signing gates without a wallet | Pass |
| `/lab/` | Regression fixtures and wallet-free public inspection remain separate from product routes | Pass |
| Browser console | Errors and warnings across tested routes | None |

The local origin intentionally exercised the direct public-RPC fallback because
it is not a production CORS origin. The independent production verifier
confirmed that the deployed D1/API snapshot matches public Coston2 state and
that both committed artifacts still pass exact-byte verification.

## Final result

**Passed.** The approved concept is integrated as a responsive product system,
not as a disconnected demo, and the existing Web3 trust and signing boundaries
remain intact.
