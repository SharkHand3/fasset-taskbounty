# Platform target: Flare Summer Signal

## Selected event

- Platform: DoraHacks
- Event: Flare Summer Signal
- Track: Interoperable Asset Products
- Format: Virtual
- Submission deadline shown by the organizer: August 14, 2026
- Project status: hacker registration completed; local engineering is in
  progress; final BUIDL submission has not been completed yet

## Why this target was selected

1. Flare is EVM-compatible, so the current Solidity and Foundry knowledge is
   directly reusable.
2. The event explicitly accepts existing projects, provided the team explains
   what was added during the event.
3. Coston2 provides a test environment, so the project can be built without
   putting real funds at risk.
4. The project requires a working product, repository, technical explanation,
   and demo. These are useful portfolio signals for international Web3 roles.

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

The current contract accepts an ERC-20 address generically, so the final product
must demonstrate real FTestXRP use in the frontend and Coston2 transaction flow.
The Flare-specific integration must be visible in the deployed contract,
balance/approval UX, explorer evidence, and technical documentation rather than
only in the project description.

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
- Web frontend, public demo, architecture notes, and demo video.

## Deliberately deferred from MVP

- Dispute arbitration.
- Deadlines and timeout settlement.
- Partial payments and milestones.
- Multi-token markets.
- Upgradeable contracts.
- Mainnet deployment.
