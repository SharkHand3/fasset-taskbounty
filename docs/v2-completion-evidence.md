# TaskBounty V2 Coston2 Completion Evidence

This record was generated after creator approval from public Coston2
receipts, contract reads, event logs, and FTestXRP balances. It is deliberately
separate from the immutable worker result manifest: the approval transaction
did not exist when the worker called `submitWork`.

The same evidence is also available as a machine-readable
[`v2-completion-record.json`](v2-completion-record.json), which models the
output a future indexer/API should generate.

## Scope and public identifiers

| Field | Value |
|---|---|
| Network | Flare Testnet Coston2 |
| Chain ID | `114` |
| Contract version | `2.0.0` |
| TaskBounty V2 | `0x26281308BE46D9b499579CC8776615C69f29826F` |
| Reward token | FTestXRP (`0x0b6A3645c240605887a5532109323A3E12273dc7`) |
| Token decimals | `6` |
| Creator | `0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D` |
| Worker | `0x149e8a5BdF5FdDec7CA1163aefC0bBfF91C9DcAd` |
| V2 task ID | `1` |
| Reward | `1,000,000` raw units = `1 FTestXRP` |
| Source commit | `10e560281e6a3323d9921bbf746af326083f0107` |
| Manifest commit | `228cdbd14f1280955ce726adc13c2d7540c0c263` |

V2 Task #1 is independent from V1 Task #1 because task identifiers are local
to each contract deployment.

## Artifact commitments

### Creator task manifest

- URI: `https://raw.githubusercontent.com/SharkHand3/fasset-taskbounty/228cdbd14f1280955ce726adc13c2d7540c0c263/docs/v2-integration-task.json`
- Keccak-256: `0x346a8ed27a9ace38c3463718bf1043bd2d590a974a86c426fd8f0d245dda534b`

### Worker result manifest

- URI: `https://raw.githubusercontent.com/SharkHand3/fasset-taskbounty/228cdbd14f1280955ce726adc13c2d7540c0c263/docs/v2-integration-result.json`
- Keccak-256: `0x59f387788cb0121d7a9d6ba319e5580923037dfb3eb8e8e46e0c88cfa81177ce`

The hashes are commitments to the exact file bytes, not hashes of the URI
strings. The Git commit in each URI fixes the retrieval path to one repository
version, while the on-chain hash lets a client detect any byte mismatch.

## Deployment verification

- Contract: [`0x26281308BE46D9b499579CC8776615C69f29826F`](https://coston2-explorer.flare.network/address/0x26281308BE46D9b499579CC8776615C69f29826F)
- Transaction: [`0x9534f647676b0ff96e6a881f3a73ca5ee8de9c940fe26d8b18f9c280ff9a0ca8`](https://coston2-explorer.flare.network/tx/0x9534f647676b0ff96e6a881f3a73ca5ee8de9c940fe26d8b18f9c280ff9a0ca8)
- Block: `32928923`
- Receipt status: `1` (success)
- Gas used: `1,132,153`
- Runtime code: `4,777` bytes

Public reads after deployment returned:

```text
VERSION()       = "2.0.0"
rewardToken()   = 0x0b6A3645c240605887a5532109323A3E12273dc7
nextTaskId()    = 1
totalEscrowed() = 0
```

## Workflow transactions

| Step | Signer | Transaction | Block | Gas used | Result |
|---|---|---|---:|---:|---|
| Deploy V2 | Creator | [`0x9534...0ca8`](https://coston2-explorer.flare.network/tx/0x9534f647676b0ff96e6a881f3a73ca5ee8de9c940fe26d8b18f9c280ff9a0ca8) | `32928923` | `1,132,153` | V2 created |
| FTestXRP `approve` | Creator | [`0xe8e6...b22f`](https://coston2-explorer.flare.network/tx/0xe8e6f0e6e851e3e1d1b1f053682596c3725afc193bc0ce24c20e936c1512b22f) | `32928992` | `51,217` | Allowance = 1 FTestXRP |
| `createTask` | Creator | [`0xf8da...5a03`](https://coston2-explorer.flare.network/tx/0xf8da7f18075f7d8dae393996aeb7e9f6a9c9704fcb6b6d0be6b3b194f2665a03) | `32928999` | `434,737` | Exact reward escrowed; `Open` |
| `acceptTask` | Worker | [`0xc9a3...ad63`](https://coston2-explorer.flare.network/tx/0xc9a37d99564496dd673d7fe30aef7c88e964cab28c7c1d75d704a10833fcad63) | `32929020` | `52,799` | `InProgress` |
| `submitWork` | Worker | [`0x3ed6...7124`](https://coston2-explorer.flare.network/tx/0x3ed6d607294057f41cd05e4190e54174fbd6798b4c382c0ac5fc32f271f27124) | `32929029` | `191,917` | Result committed; `Submitted` |
| `approveTask` | Creator | [`0xaf9e...4d2c`](https://coston2-explorer.flare.network/tx/0xaf9ed72d2b2d5cc9c0f2dec4a726bf7bce7435a8bb15245040e37e8d07814d2c) | `32929045` | `146,853` | Reward paid; `Completed` |

Every receipt returned status `1`.

## Event evidence

The business logs were selected by both emitting contract address and event
signature, rather than by assuming every receipt log belongs to TaskBounty.
Coston2 receipts can contain unrelated system logs.

### Task creation

The `createTask` receipt contains:

- FTestXRP `Transfer(Creator, TaskBounty V2, 1_000_000)`;
- V2 `TaskCreated` with task ID `1`;
- creator `0x43bb...6a2D`;
- indexed metadata hash `0x346a8e...a534b`;
- reward `1,000,000` and the version-pinned task URI.

The V2 `TaskCreated` signature topic is:

```text
0x5b58c8198c2e2fefdfe0ee82bcb23cfef123af2816b3df02f534f8c00231f15b
```

### Worker acceptance and result submission

`TaskAccepted` records task ID `1` and the worker address. `WorkSubmitted`
records the same task and worker plus the indexed result commitment:

```text
resultHash = 0x59f387788cb0121d7a9d6ba319e5580923037dfb3eb8e8e46e0c88cfa81177ce
topic0     = 0x4eddd05decdc6d6aab51b897ab47ac4c0a8fdd8d59c39dc16a487b40adf4e1d2
```

Neither acceptance nor submission moved FTestXRP. The reward remained in V2
and `totalEscrowed` remained `1,000,000` until creator approval.

### Creator approval and payment

The approval receipt contains both:

- FTestXRP `Transfer(TaskBounty V2, Worker, 1_000_000)`;
- `TaskCompleted(taskId=1, worker, reward=1_000_000)`.

The `TaskCompleted` signature topic is:

```text
0x843af93d40addceac6932508439844b897d4df9e971db326d557e3cdaa9f3ebf
```

This combination proves that the completed state transition and reward
release occurred in the same successful transaction.

## Historical state and balance evidence

All values below were read through the public RPC with `--block`, so each row
can be reproduced even if later tasks change current balances.

| Checkpoint | Block | Status | Creator | V2 escrow balance | Worker | Allowance | `totalEscrowed` |
|---|---:|---|---:|---:|---:|---:|---:|
| After token approval | `32928992` | Not created | 9 | 0 | 1 | 1 | 0 |
| After `createTask` | `32928999` | `Open` (`0`) | 8 | 1 | 1 | 0 | 1 |
| After `acceptTask` | `32929020` | `InProgress` (`1`) | 8 | 1 | 1 | 0 | 1 |
| After `submitWork` | `32929029` | `Submitted` (`2`) | 8 | 1 | 1 | 0 | 1 |
| After `approveTask` | `32929045` | `Completed` (`3`) | 8 | 0 | 2 | 0 | 0 |

Token balances and liabilities in the table are FTestXRP. One displayed token
equals `1,000,000` raw units.

At block `32929045`, `getTask(1)` returned the expected creator, worker,
reward, both committed URI/hash pairs, status `3`, and `exists = true`.
The historical V1 TaskBounty balance remained zero, confirming this workflow
used the new V2 address.

## Reproducible public RPC checks

These Git Bash commands are read-only. They require no account, signature,
keystore, password, or gas token.

```bash
RPC=https://coston2-api.flare.network/ext/C/rpc
V2=0x26281308BE46D9b499579CC8776615C69f29826F
FXRP=0x0b6A3645c240605887a5532109323A3E12273dc7
CREATOR=0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D
WORKER=0x149e8a5BdF5FdDec7CA1163aefC0bBfF91C9DcAd
FINAL_BLOCK=32929045
RESULT_URI=https://raw.githubusercontent.com/SharkHand3/fasset-taskbounty/228cdbd14f1280955ce726adc13c2d7540c0c263/docs/v2-integration-result.json

cast chain-id --rpc-url "$RPC"
cast codesize "$V2" --rpc-url "$RPC"
cast call "$V2" "VERSION()(string)" --rpc-url "$RPC"
cast receipt 0x3ed6d607294057f41cd05e4190e54174fbd6798b4c382c0ac5fc32f271f27124 --rpc-url "$RPC"
cast receipt 0xaf9ed72d2b2d5cc9c0f2dec4a726bf7bce7435a8bb15245040e37e8d07814d2c --rpc-url "$RPC"
cast call "$V2" "getTask(uint256)((address,address,uint256,string,bytes32,string,bytes32,uint8,bool))" 1 --block "$FINAL_BLOCK" --rpc-url "$RPC"
cast call "$V2" "totalEscrowed()(uint256)" --block "$FINAL_BLOCK" --rpc-url "$RPC"
cast call "$FXRP" "balanceOf(address)(uint256)" "$CREATOR" --block "$FINAL_BLOCK" --rpc-url "$RPC"
cast call "$FXRP" "balanceOf(address)(uint256)" "$V2" --block "$FINAL_BLOCK" --rpc-url "$RPC"
cast call "$FXRP" "balanceOf(address)(uint256)" "$WORKER" --block "$FINAL_BLOCK" --rpc-url "$RPC"
cast call "$FXRP" "allowance(address,address)(uint256)" "$CREATOR" "$V2" --block "$FINAL_BLOCK" --rpc-url "$RPC"
```

To independently verify either retrieved artifact, download it and hash its
exact bytes:

```bash
curl -fsSL "$RESULT_URI" -o /tmp/result.json
RESULT_HEX=$(xxd -p /tmp/result.json | tr -d '\n')
cast keccak "0x$RESULT_HEX"
```

No private key, mnemonic, keystore password, or signing secret is stored in
this record or elsewhere in the repository.
