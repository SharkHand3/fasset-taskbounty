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

The local tests use a mock ERC-20 token. The first Coston2 integration
deployment is live and bound to the official FTestXRP contract. Public RPC
checks confirmed chain ID `114`, successful runtime bytecode, the expected
reward token, and `nextTaskId = 1`. The next milestone is executing the full
approve, create, accept, submit, and release workflow with two test accounts.

### Current Coston2 integration deployment

- TaskBounty: [`0x6B98d7B6be4934c20bD8CdfdF2bc5Dfb3A454043`](https://coston2-explorer.flare.network/address/0x6B98d7B6be4934c20bD8CdfdF2bc5Dfb3A454043)
- Deployment transaction: [`0x8796ec11c3bbb6ba78fb072bf7ba12cdaa7927ec03574036229e3910cb5171b8`](https://coston2-explorer.flare.network/tx/0x8796ec11c3bbb6ba78fb072bf7ba12cdaa7927ec03574036229e3910cb5171b8)
- Reward token: `0x0b6A3645c240605887a5532109323A3E12273dc7` (FTestXRP)
- Network: Flare Testnet Coston2 (`114`)
- Build target: Solidity `0.8.35`, EVM `cancun`, optimizer enabled with 200 runs

This is an integration deployment used to prove the end-to-end workflow. A
final submission deployment will follow after the workflow and UI are stable.

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

## Coston2 setup

The repository contains the official Coston2 RPC alias and a dedicated
TaskBounty deployment script. See [`docs/coston2-setup.md`](docs/coston2-setup.md)
for the network, faucet, encrypted-keystore, balance-check, and deployment
steps.

## Safety boundary

- Development starts on Anvil and in Foundry tests.
- Network deployment will use Flare Testnet Coston2.
- No mainnet funds are required for the learning and submission workflow.
