# Platform target: Flare Summer Signal

## Selected event

- Platform: DoraHacks
- Event: Flare Summer Signal
- Track: Interoperable Asset Products
- Format: Virtual
- Submission opens: June 28, 2026 at 20:00 as displayed by DoraHacks
- Submission deadline shown by the organizer: August 14, 2026 at 19:59
- Time-zone note: the verified page content does not label the displayed time
  zone, so the project will target submission at least 24 hours early
- Project status: product, Coston2 deployment, public frontend, indexed read
  API, and technical evidence are complete; video and authenticated final BUIDL
  submission remain user-owned actions

## Why this target was selected

1. Flare is EVM-compatible, so the current Solidity and Foundry knowledge is
   directly reusable.
2. The event explicitly accepts existing projects, provided the team explains
   what was added during the event.
3. Coston2 provides a test environment, so the project can be built without
   putting real funds at risk.
4. The judging criteria reward a useful working product, meaningful Flare use,
   technical execution, evidence of new work, and a credible path beyond the
   hackathon. These map directly to the project's public product and evidence.

## Product scope

## Bounty fit

The project targets **Bounty 1 — Interoperable Asset Products**. Its core use
case is to escrow FTestXRP on Coston2 so that an interoperable representation of
XRP can pay for technical work inside an EVM application.

It does not currently target **Bounty 2 — Confidential Compute Apps**. The MVP
does not execute private logic in Flare Confidential Compute or a TEE; its
contract state and emitted events are public. Adding confidential compute only
to claim a second category would expand the scope without improving the core
escrow product.

The contract accepts an ERC-20 address generically, while the deployed Coston2
instance is bound to the official FTestXRP token. The Flare-specific integration
is visible in the product UI, token approval and escrow receipts, public RPC
reads, explorer evidence, and technical documentation rather than only in the
project description.

### Problem

People holding assets such as XRP cannot directly use those assets in ordinary
EVM escrow applications. FAssets make an interoperable representation available
on Flare, but the asset still needs useful applications.

### Proposed solution

Build a task bounty escrow that uses an FAsset as the reward asset:

1. A creator deposits an FAsset and publishes a task metadata URI.
2. A worker accepts the task.
3. The worker submits a result URI.
4. The creator approves the result.
5. The contract releases the escrowed FAsset to the worker.
6. An unaccepted task can be cancelled and refunded.

## Existing work before platform targeting

- Foundry project and Counter learning contract.
- An incomplete `TaskBounty` data model containing `enum`, `struct`, and
  `mapping`, but no executable task workflow or escrow logic.

## New work for the platform project

- ERC-20/FAsset escrow flow.
- State transitions and permissions.
- Events for indexers and frontends.
- Custom errors and reentrancy protection.
- Foundry unit and fuzz tests.
- Coston2/FTestXRP deployment configuration.
- Web frontend, public demo, architecture notes, and a repeatable demo plan.
- Confirmed-event indexer, Cloudflare D1 query projection, versioned read API,
  and validated direct-RPC fallback.

## Organizer submission requirements

The verified DoraHacks detail page requests:

- project name and selected bounty;
- short description and target user;
- demo, video, or application link;
- GitHub repository or technical materials;
- explanation of how the project uses Flare;
- separation of newly built, ported, integrated, or improved work;
- deployed smart-contract addresses;
- a short roadmap.

The copy-ready answers, evidence map, recording script, and final checks are in
[`submission/`](submission/dorahacks-submission.md).

## Deliberately deferred from MVP

- Dispute arbitration.
- Deadlines and timeout settlement.
- Partial payments and milestones.
- Multi-token markets.
- Upgradeable contracts.
- Mainnet deployment.
