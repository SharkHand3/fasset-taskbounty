# Frontend Task #2 creation flow

## Purpose

This is the second frontend write milestone. It prepares the exact V2 call:

```text
TaskBountyV2.createTask(
  1_000_000,
  version-pinned metadataURI,
  Keccak-256(metadata bytes)
)
```

Unlike the preceding ERC-20 `approve`, a successful `createTask` moves exactly
`1 FTestXRP` from the Creator into TaskBounty V2 through `transferFrom`. It also
creates Task #2, increments `nextTaskId`, and increases `totalEscrowed`.

## Immutable manifest

The Creator brief was finalized before the frontend transaction code:

```text
commit:
3ad39f1ec7a01ccca913a272ef1b06f4fb2c8be3

URI:
https://raw.githubusercontent.com/SharkHand3/fasset-taskbounty/3ad39f1ec7a01ccca913a272ef1b06f4fb2c8be3/docs/task-2-frontend-lifecycle.json

Keccak-256:
0x395cc6a1d045797821521540a5b29a48ace50575b82755dc69b9534afc391c4b

byte length:
1,625
```

The local file and the bytes downloaded from the pinned Raw URL produced the
same hash. The manifest commit is intentionally separate from the later
frontend commit: a Git commit hash cannot be known until the manifest commit
exists, while the frontend needs that already-known hash in its immutable URL.
This is a content-dependency boundary, not an arbitrary duplicate commit.

## Guarded state machine

The MetaMask button remains locked unless all conditions are true:

1. A wallet is connected.
2. The wallet is on Coston2 (`chainId 114`).
3. The selected address is the dedicated Creator.
4. All required public contract reads succeeded.
5. `nextTaskId` is exactly `2`.
6. `totalEscrowed` is the expected zero baseline.
7. The Creator balance is at least `1_000_000` FTestXRP units.
8. Creator-to-V2 allowance is exactly `1_000_000` units; both an insufficient
   and an over-broad allowance are blocked by this guarded demo.
9. The pinned manifest is retrievable and its exact bytes match the configured
   Keccak-256 hash.
10. `useSimulateContract` succeeds and predicts returned `taskId == 2`.
11. `useEstimateGas` succeeds for the same target, account and calldata.
12. The user checks the exact transaction-intent review box.
13. No transaction from the panel has already been submitted.

The intent key binds account, chain, allowance, balance, `nextTaskId`,
`totalEscrowed`, and metadata hash. A change to any value invalidates the old
simulation and checkbox review.

## Browser-to-chain sequence

```text
Browser downloads pinned manifest bytes and verifies Keccak-256
  -> public RPC reads balance, allowance, nextTaskId and totalEscrowed
  -> user requests simulation
  -> Viem encodes createTask(1_000_000, URI, hash)
  -> Wagmi executes eth_call as Creator
  -> simulation must predict taskId 2
  -> Wagmi estimates gas for the same calldata
  -> user reviews chain, target, reward, task ID, URI and hash
  -> user checks the exact-intent box
  -> Wagmi passes the simulated request to MetaMask
  -> only the user can confirm and sign inside MetaMask
  -> Coston2 executes FTestXRP.transferFrom into V2 escrow
  -> frontend waits for the receipt
  -> frontend verifies the exact TaskCreated event
  -> frontend refreshes balances, allowance, nextTaskId and totalEscrowed
```

## Public pre-sign verification

On 2026-07-20 the official Coston2 RPC returned:

```text
allowance(Creator, V2) = 1,000,000
nextTaskId             = 2
totalEscrowed          = 0
```

The exact `createTask` simulation returned:

```text
predicted taskId = 2
estimated gas    = 425,032
```

A second read after simulation still returned `nextTaskId=2` and
`allowance=1,000,000`, proving that the `eth_call` did not persist state.

Reproduce these public, unsigned checks in Git Bash:

```bash
cd /d/web3/web3-taskbounty/contracts

RPC=https://coston2-api.flare.network/ext/C/rpc
FXRP=0x0b6A3645c240605887a5532109323A3E12273dc7
V2=0x26281308BE46D9b499579CC8776615C69f29826F
CREATOR=0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D
URI=https://raw.githubusercontent.com/SharkHand3/fasset-taskbounty/3ad39f1ec7a01ccca913a272ef1b06f4fb2c8be3/docs/task-2-frontend-lifecycle.json
HASH=0x395cc6a1d045797821521540a5b29a48ace50575b82755dc69b9534afc391c4b

cast call "$FXRP" "allowance(address,address)(uint256)" \
  "$CREATOR" "$V2" --rpc-url "$RPC"
cast call "$V2" "nextTaskId()(uint256)" --rpc-url "$RPC"
cast call "$V2" "totalEscrowed()(uint256)" --rpc-url "$RPC"
cast call "$V2" "createTask(uint256,string,bytes32)(uint256)" \
  1000000 "$URI" "$HASH" --from "$CREATOR" --rpc-url "$RPC"
cast estimate "$V2" "createTask(uint256,string,bytes32)" \
  1000000 "$URI" "$HASH" --from "$CREATOR" --rpc-url "$RPC"
```

These commands do not use a key, do not broadcast, and spend no gas.

## Expected post-transaction invariants

After the user later confirms the one real MetaMask transaction, the frontend
and independent public queries must verify all of the following:

```text
TaskCreated(2, Creator, metadataHash, 1_000_000, metadataURI)
getTask(2).status        = Open (0)
getTask(2).worker        = address(0)
nextTaskId              = 3
totalEscrowed            = 1,000,000
allowance(Creator, V2)  = 0
Creator FTestXRP         = 7,000,000
V2 FTestXRP              = 1,000,000
Worker FTestXRP          = 2,000,000
```

These are predeclared expectations, not claimed results. They become evidence
only after the signed transaction is mined and independently queried.
