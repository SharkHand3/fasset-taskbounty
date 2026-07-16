# Coston2 Development Setup

This project targets **Flare Testnet Coston2** before any mainnet deployment.

## Network configuration

| Field | Value |
|---|---|
| Network name | Flare Testnet Coston2 |
| HTTPS RPC | `https://coston2-api.flare.network/ext/C/rpc` |
| WSS RPC | `wss://coston2-api.flare.network/ext/C/ws` |
| Chain ID | `114` |
| Native gas token | `C2FLR` |
| Explorer | `https://coston2-explorer.flare.network` |
| Faucet | `https://faucet.flare.network` |

The `coston2` RPC alias is configured in `contracts/foundry.toml`.

```bash
cd contracts
cast chain-id --rpc-url coston2
cast block-number --rpc-url coston2
```

The expected chain ID is `114`.

## Test wallet

Use a dedicated test-only account. Never use an Anvil default key on a public
network, and never commit a private key or mnemonic to this repository.

Create the deployment account directly as an encrypted Foundry keystore so
that a raw private key never needs to be placed in a command or environment
file:

```bash
mkdir -p ~/.foundry/keystores
cast wallet new ~/.foundry/keystores coston2-deployer
cast wallet address --account coston2-deployer
```

The creation command asks for a new keystore password interactively. Store the
password safely. Do not put it in `.env`, a command line, GitHub, DoraHacks,
screenshots, or chat messages. If an existing test key must be imported later,
use `cast wallet import coston2-deployer --interactive` instead of passing the
private key on the command line.

## Faucet assets

Open `https://faucet.flare.network`, enter the dedicated test wallet address,
and request:

1. `C2FLR` for deployment and transaction gas.
2. `FXRP` for TaskBounty rewards.

`USDT0` is not required by the current MVP.

The Coston2 token shown by the faucet as FXRP has:

| Property | Value |
|---|---|
| Contract | `0x0b6A3645c240605887a5532109323A3E12273dc7` |
| Name | `FXRP` |
| Symbol | `FTestXRP` |
| Decimals | `6` |

Check the native balance:

```bash
ADDRESS=0xYourTestWalletAddress
cast balance "$ADDRESS" --ether --rpc-url coston2
```

Check the FTestXRP balance (returned in the token's smallest 6-decimal unit):

```bash
FXRP=0x0b6A3645c240605887a5532109323A3E12273dc7
cast call "$FXRP" "balanceOf(address)(uint256)" "$ADDRESS" --rpc-url coston2
```

## Deployment command

Only run this after verifying the wallet address and both balances:

```bash
forge script script/DeployTaskBounty.s.sol:DeployTaskBounty \
  --rpc-url coston2 \
  --sender 0xYourTestWalletAddress \
  --account coston2-deployer \
  --broadcast
```

The encrypted keystore password is requested interactively. The output must
show chain ID `114`, the FTestXRP reward-token address, and the new TaskBounty
contract address.

The deployment script now compiles the V2 contract on `main`. After a future
V2 deployment, verify the version and initial liability with read-only calls:

```bash
cast call "$NEW_TASK_BOUNTY" "VERSION()(string)" --rpc-url coston2
cast call "$NEW_TASK_BOUNTY" "totalEscrowed()(uint256)" --rpc-url coston2
```

Expected initial values are `"2.0.0"` and `0`. Do not run the deployment until
the V2 frontend ABI/configuration and artifact manifests are ready for a new
integration task.

## Completed V1 Cancun integration deployment

The current integration baseline was deployed on 2026-07-16 after explicitly
pinning the Flare-recommended Cancun EVM target and enabling the Solidity
optimizer.

| Field | Value |
|---|---|
| Network | Flare Testnet Coston2 |
| Chain ID | `114` |
| Build | Solidity `0.8.35`, EVM `cancun`, optimizer 200 runs |
| Deployer | `0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D` |
| TaskBounty | `0x6B98d7B6be4934c20bD8CdfdF2bc5Dfb3A454043` |
| Reward token | `0x0b6A3645c240605887a5532109323A3E12273dc7` (FTestXRP) |
| Transaction | `0x8796ec11c3bbb6ba78fb072bf7ba12cdaa7927ec03574036229e3910cb5171b8` |
| Block | `32892383` |
| Status | Success |
| Runtime code | `4,005` bytes |
| Gas used | `965,711` |
| C2FLR paid | `1.4485665` |

- [Current contract on Coston2 Explorer](https://coston2-explorer.flare.network/address/0x6B98d7B6be4934c20bD8CdfdF2bc5Dfb3A454043)
- [Current deployment transaction](https://coston2-explorer.flare.network/tx/0x8796ec11c3bbb6ba78fb072bf7ba12cdaa7927ec03574036229e3910cb5171b8)

Public RPC verification returned:

```text
chainId:       114
status:        1 (success)
runtime code:  4,005 bytes
rewardToken(): 0x0b6A3645c240605887a5532109323A3E12273dc7
nextTaskId():  1
```

This V1 address was used for the completed two-account end-to-end escrow test.
The V2 source on `main` has breaking `createTask`, `submitWork`, `TaskCreated`,
and `WorkSubmitted` signatures, so clients must not use the V2 ABI against this
historical address.

## Completed Task #1 escrow workflow

Task #1 used `1,000,000` raw units (`1 FTestXRP`) and completed the full state
machine with separate creator and worker accounts:

```text
Open -> InProgress -> Submitted -> Completed
```

| Step | Signer | Transaction | Block | Result |
|---|---|---|---:|---|
| FTestXRP `approve` | Creator | `0x607883550a6e513f8d954438d87b4dcf06ee3757773687554a3789be9e3a32b5` | `32892695` | Allowance = 1 FTestXRP |
| `createTask` | Creator | `0x137944164ac0669c02915368251b1e364fd4bb885561fd798797b0087bd3ad46` | `32893489` | Reward moved into escrow |
| `acceptTask` | Worker | `0xae14ea7ce22a45d0134b4e3042f419bdcf498841fbafa07206058bd3d57acd5e` | `32919065` | `InProgress` |
| `submitWork` | Worker | `0xb9b590691e94f3f6b8367c39ff12707b6c2dfd8dc8bb93cce53bb4bde8aad993` | `32925471` | `Submitted` |
| `approveTask` | Creator | `0x1f6d328ece3dfa179e8a0a513bb88a7f606c753e0531f4ecaa5047ece822c145` | `32925696` | `Completed`; reward released |

Public RPC calls pinned to block `32925696` returned:

```text
Task #1 status:    3 (Completed)
Creator balance:   9,000,000 raw units = 9 FTestXRP
TaskBounty balance:        0 raw units = 0 FTestXRP
Worker balance:    1,000,000 raw units = 1 FTestXRP
Allowance:                 0
```

See [`escrow-workflow-evidence.md`](escrow-workflow-evidence.md) for decoded
events, historical balances, public explorer links, and reproducible RPC
commands.

## Historical first integration deployment

The first public Coston2 deployment was completed successfully on 2026-07-15.
It is retained as a learning and audit record and is no longer the current
integration address.

| Field | Value |
|---|---|
| Network | Flare Testnet Coston2 |
| Chain ID | `114` |
| Deployer | `0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D` |
| TaskBounty | `0x362Dc83F1E12fFC05b94038A3F052461327B595e` |
| Reward token | `0x0b6A3645c240605887a5532109323A3E12273dc7` (FTestXRP) |
| Transaction | `0xe8f83bd5deada6ba5f3987480064e076af9fdb8e4fde5f3f2a3c9f720b397647` |
| Block | `32872357` |
| Status | Success |
| Gas used | `1,568,238` |
| C2FLR paid | `2.352357` |

- [Contract on Coston2 Explorer](https://coston2-explorer.flare.network/address/0x362Dc83F1E12fFC05b94038A3F052461327B595e)
- [Deployment transaction on Coston2 Explorer](https://coston2-explorer.flare.network/tx/0xe8f83bd5deada6ba5f3987480064e076af9fdb8e4fde5f3f2a3c9f720b397647)

Public RPC verification after deployment returned:

```text
chainId:       114
status:        1 (success)
runtime code:  6,797 bytes
rewardToken(): 0x0b6A3645c240605887a5532109323A3E12273dc7
nextTaskId():  1
```

This historical deployment was compiled before the repository explicitly pinned
the EVM target. Its artifact reports `osaka`. Read calls succeeded, but Flare's
current guidance recommends the `cancun` EVM target. The repository now pins
`evm_version = "cancun"` for subsequent builds and final deployments.
