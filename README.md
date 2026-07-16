# FAsset TaskBounty

FAsset TaskBounty is a small Web3 engineering project being built for the
**Interoperable Asset Products** track of the
[Flare Summer Signal](https://dorahacks.io/hackathon/flaresummersignal)
hackathon on DoraHacks.

The product goal is to let a client escrow an FAsset such as test FXRP as the
reward for a task. A worker accepts the task, submits an off-chain result URI,
and receives the escrowed reward after the client approves the work.

## Why this is an interoperable asset product

FAssets bring assets from chains without native smart contracts, such as XRP,
into Flare's EVM environment. This project gives those assets a concrete use:
paying for global technical work through an on-chain escrow workflow.

## Current milestone

The first milestone implements and tests the token escrow state machine:

```text
Open -> InProgress -> Submitted -> Completed
  |
  +--------------------------------> Cancelled
```

The local tests use a mock ERC-20 token. The Coston2 integration deployment is
live and bound to the official FTestXRP contract. Task #1 has completed the
full two-account approve, create, accept, submit, and reward-release workflow.
Public RPC checks confirmed `Completed` status and final balances of 9/0/1
FTestXRP for the creator, TaskBounty, and worker. The source contract has since
advanced to V2 artifact-integrity and escrow-accounting hardening. A new V2
deployment will precede the wallet-connected frontend write flow.

### Completed V1 Coston2 integration deployment

- TaskBounty: [`0x6B98d7B6be4934c20bD8CdfdF2bc5Dfb3A454043`](https://coston2-explorer.flare.network/address/0x6B98d7B6be4934c20bD8CdfdF2bc5Dfb3A454043)
- Deployment transaction: [`0x8796ec11c3bbb6ba78fb072bf7ba12cdaa7927ec03574036229e3910cb5171b8`](https://coston2-explorer.flare.network/tx/0x8796ec11c3bbb6ba78fb072bf7ba12cdaa7927ec03574036229e3910cb5171b8)
- Reward token: `0x0b6A3645c240605887a5532109323A3E12273dc7` (FTestXRP)
- Network: Flare Testnet Coston2 (`114`)
- Build target: Solidity `0.8.35`, EVM `cancun`, optimizer enabled with 200 runs

This address runs the V1 ABI used to prove the end-to-end workflow. It remains
valid historical evidence, but it does not contain the V2 content-hash fields
now present on `main`. A new deployment is required for V2 transactions.

### Completed Coston2 Task #1

- [Full escrow workflow evidence](docs/escrow-workflow-evidence.md)
- Worker submission: [`0xb9b590691e94f3f6b8367c39ff12707b6c2dfd8dc8bb93cce53bb4bde8aad993`](https://coston2-explorer.flare.network/tx/0xb9b590691e94f3f6b8367c39ff12707b6c2dfd8dc8bb93cce53bb4bde8aad993)
- Creator approval and payment: [`0x1f6d328ece3dfa179e8a0a513bb88a7f606c753e0531f4ecaa5047ece822c145`](https://coston2-explorer.flare.network/tx/0x1f6d328ece3dfa179e8a0a513bb88a7f606c753e0531f4ecaa5047ece822c145)
- Final state: `Completed` (`3`)
- Final balances: Creator `9`, TaskBounty `0`, Worker `1` FTestXRP

### V2 artifact-integrity model

V2 separates the task manifest, worker result, and post-approval completion
record. `createTask` and `submitWork` bind each URI to the Keccak-256 hash of
the exact artifact bytes:

```solidity
createTask(uint256 reward, string metadataURI, bytes32 metadataHash)
submitWork(uint256 taskId, string resultURI, bytes32 resultHash)
```

The contract also tracks `totalEscrowed` and rejects a deposit unless the
reward token delivers the exact requested amount. This prevents a
fee-on-transfer token from silently underfunding a task.

See [`docs/artifact-integrity.md`](docs/artifact-integrity.md) for the real-world
artifact workflow, sample manifests, Git Bash hashing command, URI choices,
completion-record model, and V1/V2 compatibility notes.
Runnable JSON starting points are in [`docs/examples/`](docs/examples/).

## Repository layout

```text
web3-taskbounty/
├── contracts/            Solidity contracts, scripts, and Foundry tests
├── frontend/             Wallet-connected web application
├── backend/              Event indexer and read API
├── docs/                 Product and hackathon notes
└── README.md
```

## Local setup

The project currently pins OpenZeppelin Contracts `v5.6.1` and forge-std
`v1.16.2`.

```bash
cd contracts
forge install foundry-rs/forge-std@v1.16.2 --no-git --shallow
forge install OpenZeppelin/openzeppelin-contracts@v5.6.1 --no-git --shallow
forge build
forge test
```

The current V2 suite contains 11 business tests, including 256 fuzz runs and a
fee-on-transfer underfunding test.

## Coston2 setup

The repository contains the official Coston2 RPC alias and a dedicated
TaskBounty deployment script. See [`docs/coston2-setup.md`](docs/coston2-setup.md)
for the network, faucet, encrypted-keystore, balance-check, and deployment
steps.

## Safety boundary

- Development starts on Anvil and in Foundry tests.
- Network deployment will use Flare Testnet Coston2.
- No mainnet funds are required for the learning and submission workflow.
