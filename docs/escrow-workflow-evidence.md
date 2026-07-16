# FTestXRP Escrow Workflow Evidence

This note records the first completed end-to-end FAsset TaskBounty workflow on
**Flare Testnet Coston2**. The worker submitted this document's stable branch
URL, the creator approved the result, and the escrowed FTestXRP was released
to the worker.

## Scope and public identifiers

| Field | Value |
|---|---|
| Network | Flare Testnet Coston2 |
| Chain ID | `114` |
| Reward token | FTestXRP (`0x0b6A3645c240605887a5532109323A3E12273dc7`) |
| Token decimals | `6` |
| TaskBounty | `0x6B98d7B6be4934c20bD8CdfdF2bc5Dfb3A454043` |
| Creator | `0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D` |
| Worker | `0x149e8a5BdF5FdDec7CA1163aefC0bBfF91C9DcAd` |
| Task ID | `1` |
| Reward | `1,000,000` raw units = `1 FTestXRP` |
| Task metadata | [Immutable commit URL](https://raw.githubusercontent.com/SharkHand3/fasset-taskbounty/849ccd0ebf0d422ff5677117939921add03d20c4/docs/demo-task-1.json) |
| Result URI used by `submitWork` | `https://raw.githubusercontent.com/SharkHand3/fasset-taskbounty/main/docs/escrow-workflow-evidence.md` |

All addresses, transaction hashes, blocks, event logs, and balances below are
public testnet data. No private key, mnemonic, keystore password, or signing
secret is stored in this repository.

## Workflow status

| Step | Signer | Called contract | Token movement | Task status after step | Evidence |
|---|---|---|---|---|---|
| Deploy `TaskBounty` | Creator/deployer | Contract creation | None | N/A | Complete |
| `approve(TaskBounty, 1_000_000)` | Creator | FTestXRP | None; allowance only | N/A | Complete |
| `createTask(1_000_000, metadataURI)` | Creator | TaskBounty | Creator -> TaskBounty | `Open` (`0`) | Complete |
| `acceptTask(1)` | Worker | TaskBounty | None | `InProgress` (`1`) | Complete |
| `submitWork(1, resultURI)` | Worker | TaskBounty | None | `Submitted` (`2`) | Complete |
| `approveTask(1)` | Creator | TaskBounty | TaskBounty -> Worker | `Completed` (`3`) | Complete |

## Transaction evidence

### 1. Cancun integration deployment

- Transaction: [`0x8796ec11c3bbb6ba78fb072bf7ba12cdaa7927ec03574036229e3910cb5171b8`](https://coston2-explorer.flare.network/tx/0x8796ec11c3bbb6ba78fb072bf7ba12cdaa7927ec03574036229e3910cb5171b8)
- Block: `32892383`
- Receipt status: `1` (success)
- Gas used: `965,711`
- Created contract: `0x6B98d7B6be4934c20bD8CdfdF2bc5Dfb3A454043`

The deployment is compiled with Solidity `0.8.35`, EVM target `cancun`, and
the optimizer enabled with 200 runs. Its immutable `rewardToken()` points to
the FTestXRP address listed above.

### 2. Creator allowance

- Transaction: [`0x607883550a6e513f8d954438d87b4dcf06ee3757773687554a3789be9e3a32b5`](https://coston2-explorer.flare.network/tx/0x607883550a6e513f8d954438d87b4dcf06ee3757773687554a3789be9e3a32b5)
- Block: `32892695`
- Signer: Creator
- Target: FTestXRP
- Call: `approve(TaskBounty, 1_000_000)`
- Receipt status: `1` (success)
- Gas used: `51,217`

The FTestXRP `Approval` log records the creator as owner, TaskBounty as
spender, and `0x0f4240` (`1,000,000`) in `data`. `approve` changes the
allowance mapping; it does **not** transfer tokens. At block `32892695`, the
creator still held `10 FTestXRP`, TaskBounty held `0`, and the allowance was
`1 FTestXRP`.

### 3. Task creation and escrow deposit

- Transaction: [`0x137944164ac0669c02915368251b1e364fd4bb885561fd798797b0087bd3ad46`](https://coston2-explorer.flare.network/tx/0x137944164ac0669c02915368251b1e364fd4bb885561fd798797b0087bd3ad46)
- Block: `32893489`
- Signer: Creator
- Target: TaskBounty
- Call: `createTask(1_000_000, metadataURI)`
- Receipt status: `1` (success)
- Gas used: `361,578`

`createTask` wrote Task #1 and then called FTestXRP `transferFrom`. The receipt
contains both the token `Transfer` log and TaskBounty `TaskCreated` log. The
token transfer moved `1 FTestXRP` from the creator into TaskBounty, and the
previous allowance was consumed back to zero. Solidity transaction atomicity
means that a failed token transfer would also revert the new task state and
its event.

### 4. Worker acceptance

- Transaction: [`0xae14ea7ce22a45d0134b4e3042f419bdcf498841fbafa07206058bd3d57acd5e`](https://coston2-explorer.flare.network/tx/0xae14ea7ce22a45d0134b4e3042f419bdcf498841fbafa07206058bd3d57acd5e)
- Block: `32919065`
- Signer: Worker
- Target: TaskBounty
- Call: `acceptTask(1)`
- Receipt status: `1` (success)
- Gas used: `52,799`

The relevant `TaskAccepted` log was selected by both emitting contract address
and event signature. Its topics are:

```text
topic0 = 0xc8717b61398fb9d7cacf49fe1e296b2f10e9711226b532842b6ffd642cb6a2c6
topic1 = 0x0000000000000000000000000000000000000000000000000000000000000001
topic2 = 0x000000000000000000000000149e8a5bdf5fddec7ca1163aefc0bbff91c9dcad
data   = 0x
```

`topic1` is Task ID `1`, and `topic2` is the zero-padded worker address. Both
event parameters are `indexed`, so this particular event has no non-indexed
payload and its `data` is empty. Other logs in the same Coston2 receipt are not
TaskBounty business events and must not be decoded as `TaskAccepted`.

### 5. Work submission

- Transaction: [`0xb9b590691e94f3f6b8367c39ff12707b6c2dfd8dc8bb93cce53bb4bde8aad993`](https://coston2-explorer.flare.network/tx/0xb9b590691e94f3f6b8367c39ff12707b6c2dfd8dc8bb93cce53bb4bde8aad993)
- Block: `32925471`
- Signer: Worker
- Target: TaskBounty
- Call: `submitWork(1, resultURI)`
- Receipt status: `1` (success)
- Gas used: `145,859`

The submitted stable branch URL is:

```text
https://raw.githubusercontent.com/SharkHand3/fasset-taskbounty/main/docs/escrow-workflow-evidence.md
```

The transaction input starts with selector `0xda8accf9`, which matches
`submitWork(uint256,string)`. The `WorkSubmitted` event has signature topic:

```text
topic0 = 0xd5d9bc882dc95f198786a74e52a0b87e49a07c80921b74821ba374339e394d30
topic1 = 0x0000000000000000000000000000000000000000000000000000000000000001
topic2 = 0x000000000000000000000000149e8a5bdf5fddec7ca1163aefc0bbff91c9dcad
```

The non-indexed dynamic `string` in `data` decodes to the URL above. This call
stored the URI, changed the task from `InProgress` to `Submitted`, and emitted
`WorkSubmitted`. It did not move FTestXRP, so balances remained 9/1/0 for the
creator, TaskBounty, and worker.

### 6. Creator approval and reward release

- Transaction: [`0x1f6d328ece3dfa179e8a0a513bb88a7f606c753e0531f4ecaa5047ece822c145`](https://coston2-explorer.flare.network/tx/0x1f6d328ece3dfa179e8a0a513bb88a7f606c753e0531f4ecaa5047ece822c145)
- Block: `32925696`
- Signer: Creator
- Target: TaskBounty
- Call: `approveTask(1)`
- Receipt status: `1` (success)
- Gas used: `173,084`

The FTestXRP `Transfer` log records TaskBounty as sender, the worker as
recipient, and `0x0f4240` (`1,000,000`) as the amount. The TaskBounty event is:

```text
topic0 = 0x843af93d40addceac6932508439844b897d4df9e971db326d557e3cdaa9f3ebf
topic1 = 0x0000000000000000000000000000000000000000000000000000000000000001
topic2 = 0x000000000000000000000000149e8a5bdf5fddec7ca1163aefc0bbff91c9dcad
data   = 0x00000000000000000000000000000000000000000000000000000000000f4240
```

This decodes as `TaskCompleted(taskId=1, worker=0x149e...DcAd,
reward=1_000_000)`. The contract set the task status to `Completed` before the
external token transfer, then `SafeERC20.safeTransfer` released the escrowed
reward to the recorded worker.

## Balance and allowance evidence

The values below were read from FTestXRP with public RPC calls pinned to the
listed block. Parentheses show raw six-decimal token units.

| Checkpoint | Block | Creator balance | TaskBounty balance | Worker balance | Creator -> TaskBounty allowance |
|---|---:|---:|---:|---:|---:|
| After `approve` | `32892695` | 10 (`10,000,000`) | 0 (`0`) | 0 (`0`) | 1 (`1,000,000`) |
| After `createTask` | `32893489` | 9 (`9,000,000`) | 1 (`1,000,000`) | 0 (`0`) | 0 (`0`) |
| After `acceptTask` | `32924648` | 9 (`9,000,000`) | 1 (`1,000,000`) | 0 (`0`) | 0 (`0`) |
| After `submitWork` | `32925471` | 9 (`9,000,000`) | 1 (`1,000,000`) | 0 (`0`) | 0 (`0`) |
| After `approveTask` | `32925696` | 9 (`9,000,000`) | 0 (`0`) | 1 (`1,000,000`) | 0 (`0`) |

At block `32925696`, `getTask(1)` returned:

```text
creator     = 0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D
worker      = 0x149e8a5BdF5FdDec7CA1163aefC0bBfF91C9DcAd
reward      = 1000000
metadataURI = https://raw.githubusercontent.com/SharkHand3/fasset-taskbounty/849ccd0ebf0d422ff5677117939921add03d20c4/docs/demo-task-1.json
resultURI   = https://raw.githubusercontent.com/SharkHand3/fasset-taskbounty/main/docs/escrow-workflow-evidence.md
status      = 3 (Completed)
exists      = true
```

`nextTaskId()` returned `2`, confirming that Task #1 exists and the next
created task will receive ID 2.

## Reproducible public RPC checks

These are read-only calls: they require no account, signature, C2FLR, or
keystore password.

```bash
RPC=https://coston2-api.flare.network/ext/C/rpc
TASK_BOUNTY=0x6B98d7B6be4934c20bD8CdfdF2bc5Dfb3A454043
FXRP=0x0b6A3645c240605887a5532109323A3E12273dc7
CREATOR=0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D
WORKER=0x149e8a5BdF5FdDec7CA1163aefC0bBfF91C9DcAd

cast chain-id --rpc-url "$RPC"
cast receipt 0xb9b590691e94f3f6b8367c39ff12707b6c2dfd8dc8bb93cce53bb4bde8aad993 --rpc-url "$RPC"
cast receipt 0x1f6d328ece3dfa179e8a0a513bb88a7f606c753e0531f4ecaa5047ece822c145 --rpc-url "$RPC"
cast call "$TASK_BOUNTY" \
  "getTask(uint256)((address,address,uint256,string,string,uint8,bool))" 1 \
  --block 32925696 --rpc-url "$RPC"
cast call "$FXRP" "balanceOf(address)(uint256)" "$CREATOR" \
  --block 32925696 --rpc-url "$RPC"
cast call "$FXRP" "balanceOf(address)(uint256)" "$TASK_BOUNTY" \
  --block 32925696 --rpc-url "$RPC"
cast call "$FXRP" "balanceOf(address)(uint256)" "$WORKER" \
  --block 32925696 --rpc-url "$RPC"
cast call "$FXRP" "allowance(address,address)(uint256)" "$CREATOR" "$TASK_BOUNTY" \
  --block 32925696 --rpc-url "$RPC"
```

`--block` makes a historical query reproducible. Omitting it queries `latest`,
whose result can change after a later transaction.

## Final immutable evidence

The completed workflow evidence in this version will be pinned to an immutable
Git commit. A subsequent documentation-only commit will place that immutable
URL here without changing any of the chain evidence above.
