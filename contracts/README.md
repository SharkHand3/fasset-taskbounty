# FAsset TaskBounty Contracts

Foundry workspace for the TaskBounty escrow contract.

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

## Coston2

Network and faucet setup is documented in
[`../docs/coston2-setup.md`](../docs/coston2-setup.md).

After creating and funding the encrypted `coston2-deployer` keystore:

```bash
forge script script/DeployTaskBounty.s.sol:DeployTaskBounty \
  --rpc-url coston2 \
  --sender 0xYourTestWalletAddress \
  --account coston2-deployer \
  --broadcast
```

Never use Anvil default keys on a public network and never place a private key
in this repository.
