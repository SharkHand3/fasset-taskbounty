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
  --account coston2-deployer \
  --broadcast
```

The encrypted keystore password is requested interactively. The output must
show chain ID `114`, the FTestXRP reward-token address, and the new TaskBounty
contract address.
