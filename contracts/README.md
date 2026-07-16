# FAsset TaskBounty Contracts

Foundry workspace for the TaskBounty V2 escrow contract. V2 commits task and
result artifacts with URI + Keccak-256 hash pairs, tracks `totalEscrowed`, and
rejects underfunded fee-on-transfer deposits.

## Install dependencies

```bash
forge install foundry-rs/forge-std@v1.16.2 --no-git --shallow
forge install OpenZeppelin/openzeppelin-contracts@v5.6.1 --no-git --shallow
```

## Build and test

```bash
forge fmt --check
forge build
forge test
```

The V2 write signatures are:

```solidity
createTask(uint256 reward, string metadataURI, bytes32 metadataHash)
submitWork(uint256 taskId, string resultURI, bytes32 resultHash)
```

Hash the exact artifact bytes, not the URI text. See
[`../docs/artifact-integrity.md`](../docs/artifact-integrity.md) before creating
a V2 task.

## Coston2

Network and faucet setup is documented in
[`../docs/coston2-setup.md`](../docs/coston2-setup.md).

After creating and funding the encrypted `coston2-deployer` keystore, the
following command deploys the current V2 source. The completed V1 address
cannot be upgraded in place:

```bash
forge script script/DeployTaskBounty.s.sol:DeployTaskBounty \
  --rpc-url coston2 \
  --sender 0xYourTestWalletAddress \
  --account coston2-deployer \
  --broadcast
```

Never use Anvil default keys on a public network and never place a private key
in this repository.
