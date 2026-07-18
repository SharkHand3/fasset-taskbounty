# Frontend exact-approval flow

## Purpose

This is the first frontend write milestone. It prepares one narrowly scoped
ERC-20 allowance for a future Task #2 escrow:

```text
Creator -> FTestXRP.approve(TaskBounty V2, 1_000_000)
```

`1_000_000` is exactly `1 FTestXRP` because FTestXRP uses six decimals. This
transaction changes the token contract's allowance mapping only. It transfers
zero tokens, does not call TaskBounty and does not create Task #2.

Do not confuse the two similarly named operations:

| Operation | Contract | Meaning |
|---|---|---|
| `approve(spender, amount)` | FTestXRP ERC-20 | Authorize TaskBounty to pull an exact token amount later |
| `approveTask(taskId)` | TaskBounty V2 | Accept already-submitted work and release its escrow to the worker |

## Guarded state machine

The MetaMask confirmation button is locked unless all of these conditions are
true:

1. A wallet is connected.
2. The active chain is Coston2 (`chainId 114`).
3. The selected account is the dedicated Task #1 Creator.
4. Public reads returned the Creator balance and current allowance.
5. The balance is at least `1_000_000` units.
6. The exact allowance is not already confirmed.
7. `useSimulateContract` completed without a revert and returned `true`.
8. `useEstimateGas` returned an estimate for the same calldata.
9. The user checked the exact transaction-intent review box.
10. No transaction from this panel is already pending or recorded.

The simulation intent key contains the connected account, active chain, current
allowance and requested amount. Changing any of them invalidates both the old
simulation and the review checkbox.

## Browser-to-chain sequence

```text
Page reads balanceOf(Creator) + allowance(Creator, V2) through public RPC
  -> user clicks Simulate exact approval
  -> Viem encodes approve(V2, 1_000_000)
  -> Wagmi simulates it with eth_call as the Creator
  -> Wagmi estimates gas for the same target, account and calldata
  -> page reveals the exact-intent checkbox
  -> user reviews chain/token/spender/amount and checks it
  -> page passes the simulated request to MetaMask
  -> MetaMask displays the transaction and signs locally after user confirmation
  -> transaction is broadcast to Coston2
  -> page waits for the public receipt
  -> page decodes the exact Approval(Creator, V2, 1_000_000) event
  -> page refreshes allowance(Creator, V2)
```

Cloudflare Pages serves static HTML, CSS and JavaScript. It is not in the
signature path and never receives the private key, recovery phrase, keystore
password or MetaMask vault password.

## Pre-sign public verification

On 2026-07-19, before any frontend approval was signed, two public query paths
agreed on the relevant state:

| Query path | Observed block | Creator balance | Creator -> V2 allowance |
|---|---:|---:|---:|
| Official Coston2 RPC | `33000471` | `8,000,000` | `0` |
| Routescan Coston2 proxy | `33000478` | `8,000,000` | `0` |

The official RPC also simulated the exact call from the Creator address:

```text
approve(V2, 1_000_000) returned true
estimated gas limit: 51,609
allowance after simulation: 0
```

The unchanged allowance proves that `eth_call` simulation executes without
persisting state. Only a signed and mined transaction can change the allowance.

Reproduce the official-RPC checks in Git Bash without any secret:

```bash
cd /d/web3/web3-taskbounty/contracts

RPC=https://coston2-api.flare.network/ext/C/rpc
FXRP=0x0b6A3645c240605887a5532109323A3E12273dc7
V2=0x26281308BE46D9b499579CC8776615C69f29826F
CREATOR=0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D

cast call "$FXRP" "balanceOf(address)(uint256)" "$CREATOR" --rpc-url "$RPC"
cast call "$FXRP" "allowance(address,address)(uint256)" \
  "$CREATOR" "$V2" --rpc-url "$RPC"
cast call "$FXRP" "approve(address,uint256)(bool)" \
  "$V2" 1000000 --from "$CREATOR" --rpc-url "$RPC"
cast estimate "$FXRP" "approve(address,uint256)" \
  "$V2" 1000000 --from "$CREATOR" --rpc-url "$RPC"
cast call "$FXRP" "allowance(address,address)(uint256)" \
  "$CREATOR" "$V2" --rpc-url "$RPC"
```

These commands are read/simulation operations. They do not request a key, do
not create a transaction and do not spend gas.

## Approval scope and next boundary

The frontend deliberately requests the exact amount rather than `uint256.max`.
After this approval is confirmed, the Creator still owns `8 FTestXRP`. A later
`createTask` milestone will call TaskBounty V2, which uses `transferFrom` to
move exactly `1 FTestXRP` into escrow and consumes the allowance. That later
write will receive its own simulation, intent review, wallet confirmation,
receipt and public-state verification.
