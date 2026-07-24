# Evidence of work completed during Flare Summer Signal

Last verified: 2026-07-24

The organizer allows existing projects but asks teams to separate pre-existing
work from what was newly built, ported, integrated, or improved during the
program. This record makes that boundary explicit and ties claims to public
commits and deployment evidence.

## Starting point

Before targeting Flare Summer Signal, the local learning project contained:

- a standard Foundry scaffold and `Counter` learning contract;
- an incomplete `TaskBounty` data model with an `enum`, `struct`, and `mapping`;
- no executable create/accept/submit/approve/cancel lifecycle;
- no token escrow, Flare deployment, browser product, read API, or public demo.

The first public repository commit is
[`c9d699f`](https://github.com/SharkHand3/fasset-taskbounty/commit/c9d699f8be67110dbece0470fbb624d9f66a2b63).
The commit history is retained rather than squashed so judges can inspect the
development sequence.

## New engineering evidence

| Program contribution | Public evidence | Why it matters |
|---|---|---|
| Executable ERC-20 escrow lifecycle, role checks, cancellation, events, custom errors, reentrancy protection, and tests | [`c9d699f`](https://github.com/SharkHand3/fasset-taskbounty/commit/c9d699f8be67110dbece0470fbb624d9f66a2b63) and current [`TaskBounty.sol`](../../contracts/src/TaskBounty.sol) | Converts the learning data model into a usable settlement protocol |
| Coston2 configuration and first public deployment | [`22219ad`](https://github.com/SharkHand3/fasset-taskbounty/commit/22219ade2a275ab67168526782288c2d4ae2c773) | Demonstrates an actual Flare testnet integration rather than a local-only prototype |
| Full two-account V1 lifecycle evidence | [`95af0ec`](https://github.com/SharkHand3/fasset-taskbounty/commit/95af0ec96bbe1741f5e6f627b4e315c4154064a6) and [`eb88a70`](https://github.com/SharkHand3/fasset-taskbounty/commit/eb88a70582b58b9e55c6bf26a0dc80ace9b88111) | Proves submit and approval/payment with public receipts |
| V2 exact-byte artifact commitments, exact token receipt accounting, and liabilities | [`10e5602`](https://github.com/SharkHand3/fasset-taskbounty/commit/10e560281e6a3323d9921bbf746af326083f0107) | Prevents URI-only ambiguity and fee-on-transfer underfunding |
| Immutable V2 manifests and completed Coston2 settlement | [`228cdbd`](https://github.com/SharkHand3/fasset-taskbounty/commit/228cdbd14f1280955ce726adc13c2d7540c0c263) and [`d1a1c5d`](https://github.com/SharkHand3/fasset-taskbounty/commit/d1a1c5ddd25b4468a7785b3e89bbdb40a96bf884) | Gives reproducible content and transaction proof for the final protocol version |
| Public Next.js Coston2 dashboard and artifact verification | [`b782ded`](https://github.com/SharkHand3/fasset-taskbounty/commit/b782ded86a9a184fe8b4f16c41f301b0eb78af2f) | Makes public protocol reads understandable without a wallet |
| Injected EIP-1193 wallet identity and simulation-gated writes | [`74b08e3`](https://github.com/SharkHand3/fasset-taskbounty/commit/74b08e34c4f8f855ec3777ecef6f78ed8d6a9a1d), [`96fa3a3`](https://github.com/SharkHand3/fasset-taskbounty/commit/96fa3a3ecd67125da969dda3a443771d6e683ea3), and [`a942d77`](https://github.com/SharkHand3/fasset-taskbounty/commit/a942d7703bef87acfc9a5695d951d3adf6507cc9) | Preserves user-controlled signing and makes intent/preflight failures visible |
| Generic marketplace, dynamic roles, generic lifecycle actions, and QA lab separation | [`a11a14c`](https://github.com/SharkHand3/fasset-taskbounty/commit/a11a14caeaf2ed10307a0c6898427b61a3e3759b) | Removes Task #1/#2 demo assumptions from customer-facing routes |
| Product trust-boundary and resilience hardening | [`91f6246`](https://github.com/SharkHand3/fasset-taskbounty/commit/91f62468c3ddbe54e34d5e617dbfe7223ca75804) | Adds bounded artifact reads, manifest binding, stale-request protection, numeric limits, and safer approval gates |
| Confirmed-event indexer, D1 query model, versioned API, and RPC fallback | [`8f03ab5`](https://github.com/SharkHand3/fasset-taskbounty/commit/8f03ab56b8ac4f81d08b2485443dc728cb49b8fb) and [`371d2aa`](https://github.com/SharkHand3/fasset-taskbounty/commit/371d2aa8d6cba60a6fe8738a116b2c3f794c11f1) | Adds scalable discovery without turning the database into a settlement authority |
| Human Proof product design and responsive/reduced-motion QA | [`23a2078`](https://github.com/SharkHand3/fasset-taskbounty/commit/23a20784ff53f8b3ff561e51ec0c1b63e921c508) | Turns an engineering dashboard into a coherent, public-facing product surface |

## Verifiable final integration

The current V2 integration uses:

- Coston2 chain ID `114`;
- official FTestXRP at `0x0b6A3645c240605887a5532109323A3E12273dc7`;
- TaskBounty V2 at `0x26281308BE46D9b499579CC8776615C69f29826F`;
- distinct creator and worker testnet accounts;
- a successful `Open -> InProgress -> Submitted -> Completed` lifecycle;
- a `1 FTestXRP` escrow transfer to the contract and final release to the worker;
- creator and worker artifacts whose exact bytes match their on-chain hashes;
- zero remaining token balance and zero `totalEscrowed` liability after
  completion.

The complete receipts, historical block reads, event signatures, and
reproduction commands are in
[`v2-completion-evidence.md`](../v2-completion-evidence.md).

## Claims deliberately not made

- The project does not claim mainnet deployment, an external security audit,
  production users, partners, revenue, or transaction volume.
- The application consumes the official Coston2 FTestXRP token; it does not
  mint FAssets itself and does not claim a direct FDC call.
- The Cloudflare D1 projection is not presented as a ledger or settlement
  authority.
- The current implementation is a testnet product milestone, not a finished
  dispute-governance or freelancing platform.
