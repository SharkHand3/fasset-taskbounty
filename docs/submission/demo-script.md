# FAsset TaskBounty demo script and shot list

Target duration: **3:15–3:45**
Primary language: English narration
Recording target: 1440×900 or 1920×1080, browser zoom 100%, no personal tabs or
wallet secrets visible

The strongest demo is not a live state-changing transaction. The Coston2
workflow is already complete and publicly reproducible. A recorded read-only
walkthrough is deterministic, avoids faucet or RPC timing failures, and lets
the video show the exact settlement receipts. If a wallet is shown, use only
the dedicated testnet account and never expose a private key, recovery phrase,
keystore file, or password.

## Recording preparation

1. Open the live product in a clean browser window:
   <https://fasset-taskbounty.pages.dev/>.
2. Preload these pages in the same window:
   - `/tasks/`
   - `/tasks/view/?id=1`
   - the [approval transaction](https://coston2-explorer.flare.network/tx/0xaf9ed72d2b2d5cc9c0f2dec4a726bf7bce7435a8bb15245040e37e8d07814d2c)
   - the [source repository](https://github.com/SharkHand3/fasset-taskbounty)
3. Confirm Task #1 shows `Completed`, both artifacts show verified, and the
   product reports the indexed API rather than an error.
4. Close email, personal GitHub pages, password managers, and unrelated tabs.
5. Disable notifications. Use a dedicated testnet wallet only if the wallet
   identity section is part of the recording.
6. Record one silent rehearsal and verify that addresses, status, hashes, and
   the reward are readable before recording narration.

## Timed English narration

### 0:00–0:25 — Product and problem

**Picture:** Home hero and live protocol proof ticket.

> FAsset TaskBounty is verifiable work escrow paid in FAssets on Flare. XRP
> cannot directly enter an EVM contract workflow, while online clients and
> contributors need a safer way to coordinate payment and delivery. FAssets
> make XRP programmable; TaskBounty turns that asset into a funded work reward.

**Must show:** `Coston2`, chain ID `114`, contract version `2.0.0`, and the V2
contract address.

### 0:25–0:55 — Lifecycle

**Picture:** Scroll through the workflow explanation, then open `/tasks/`.

> A creator escrows the exact FTestXRP reward and commits a task manifest. A
> participant accepts the task, publishes a result, and becomes eligible for
> payment only after the creator verifies and approves that result. An
> unaccepted task can be cancelled and refunded.

**Must show:** `Open -> In progress -> Submitted -> Completed`, without implying
that D1 or the frontend controls settlement.

### 0:55–1:35 — Completed task and evidence

**Picture:** Open `/tasks/view/?id=1`. Show role/status, reward, task manifest,
result manifest, and both verification states.

> This is a real completed Coston2 task between two testnet accounts. The brief
> and result are stored off-chain, but their exact UTF-8 bytes are committed
> on-chain with Keccak-256. The browser retrieves only allowed immutable URIs,
> recomputes the hash, and marks the artifact verified only when the bytes
> match. A URI alone is not treated as proof.

**Must show:** the `1 FTestXRP` reward, `Completed`, the creator and worker, and
both green verified states.

### 1:35–2:05 — Settlement transaction

**Picture:** Open the Coston2 explorer approval/payment receipt.

> The creator approval transaction completed the state transition and released
> one FTestXRP to the worker in the same successful receipt. At the recorded
> settlement block, the contract token balance and total escrow liability were
> both zero. All addresses, receipts, hashes, and historical block checks are
> linked from the public repository.

**Must show:** success status, transaction hash, TaskBounty V2 address, and the
token transfer or decoded logs if the explorer exposes them.

### 2:05–2:40 — Wallet and write safety

**Picture:** Return to the product; briefly show the create-task or wallet
identity surface without submitting a transaction.

> Public reads require no wallet. For a write, Wagmi and Viem detect an injected
> EIP-1193 wallet, verify the active Coston2 network, simulate the exact contract
> call, and then ask the wallet to display and sign it. The application never
> receives a private key or recovery phrase, and it reports success only after
> decoding the expected event from a successful receipt.

**Must not show:** secret material, wallet password entry, or a signature prompt
containing an unintended transaction.

### 2:40–3:12 — Read architecture and resilience

**Picture:** Show the architecture diagram in the repository and, optionally,
the live `/v1/health` or `/v1/tasks/1` API response.

> The contract remains the settlement source of truth. A Cloudflare Worker
> indexes confirmed lifecycle events into D1 for pagination, filtering, and
> artifact verification. D1 is a rebuildable read projection, not another
> ledger. The frontend validates the API's chain, contract, and version, and
> falls back to direct public RPC if that identity or response is invalid.

### 3:12–3:35 — Close and roadmap

**Picture:** Return to the home call-to-action and repository link.

> The current milestone proves a complete FTestXRP work-payment flow on
> Coston2. Next, we will automate immutable artifact publishing, add search and
> reputation, validate milestone and dispute rules with users, and complete an
> independent security review before considering a production network. The
> live product, source, API, contract, and proof are all public.

## Editing checklist

- Keep the final video under four minutes unless the submission form specifies
  a different limit.
- Cut loading gaps and failed clicks; do not accelerate so much that hashes or
  state labels become unreadable.
- Add captions for the product name, Coston2, contract address, FTestXRP, and
  the settlement transaction.
- Use only subtle background audio, or none. Narration and on-screen evidence
  are more important than motion graphics.
- Export as H.264 MP4, 1080p, 30 fps, with readable text and normalized audio.
- Upload to a publicly viewable URL and test it in a signed-out/incognito
  window before pasting it into DoraHacks.

## Optional 30-second fallback pitch

> FAsset TaskBounty turns FTestXRP into a verifiable work reward on Flare. A
> creator escrows the exact amount, a worker commits delivery bytes on-chain,
> and approval atomically releases payment. The Coston2 product includes a
> responsive frontend, simulation-gated wallet writes, a confirmed-event D1
> indexer, direct-RPC fallback, and public proof of a completed two-account
> lifecycle. It shows a practical application for programmable XRP without
> claiming custody, mainnet readiness, or an FDC integration the app does not
> perform.
