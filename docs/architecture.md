# Architecture

```text
Browser wallet
    |
    | JSON-RPC reads and user-signed transactions
    v
Flare Testnet Coston2
    |-- FTestXRP ERC-20
    `-- TaskBounty V2 escrow contract
             |-- metadataURI + metadataHash
             |-- resultURI + resultHash
             |-- task state and totalEscrowed
             |
             | events
             v
       Backend / indexer
             |-- selects ABI by deployment version
             |-- retrieves URI artifacts
             |-- verifies Keccak-256 commitments
             |-- builds completion records from chain data
             |
             v
       Query API / database

Off-chain artifact storage
    |-- content-addressed IPFS / Arweave, or
    `-- version-pinned Git/object-storage URLs
```

## Deployment surfaces

| Component | Initial environment | Status |
|---|---|---|
| Solidity contracts | Foundry / Coston2 | V1 retained; V2 deployed and Task #1 completed |
| Reward asset | Coston2 FTestXRP | Official address configured |
| Frontend | [Next.js static export / Cloudflare Pages](https://fasset-taskbounty.pages.dev/) | Public V2 reads, injected-wallet identity and simulation-gated exact approval |
| Backend/indexer | Local service | Next milestone after the frontend read slice |
| Source and documentation | [GitHub](https://github.com/SharkHand3/fasset-taskbounty) | Published on `main` |
| Hackathon submission | DoraHacks BUIDL | Registration complete; submission pending |

## V2 transaction and artifact flow

```text
Creator finalizes task manifest
  -> publishes version-pinned/content-addressed metadataURI
  -> computes metadataHash over exact bytes
  -> approves FTestXRP
  -> creates task and deposits the exact reward
  -> Worker accepts task
  -> Worker publishes an immutable result manifest
  -> Worker submits resultURI + resultHash
  -> Creator/frontend verifies the committed bytes
  -> Creator approves work
  -> TaskBounty transfers FTestXRP to worker
  -> Indexer builds completion evidence from events and receipts
```

The task manifest, worker result, and post-approval completion record are
separate artifacts. See [`artifact-integrity.md`](artifact-integrity.md) for
their schemas, hashing rules, and storage recommendations.
The first public V2 completion record is
[`v2-completion-evidence.md`](v2-completion-evidence.md).

## Current frontend read, wallet-identity and approval paths

```text
Static Next.js page in the browser
  -> Viem Public Client -> official Coston2 RPC
       -> VERSION / totalEscrowed / getTask / ERC-20 balanceOf
  -> fetch version-pinned GitHub Raw artifact bytes
       -> Uint8Array -> Keccak-256
       -> compare with metadataHash / resultHash read from V2

Optional browser-wallet path
  -> Wagmi injected connector discovers EIP-1193 providers
  -> user approves account access inside the wallet extension
  -> page receives selected public address + active chain ID
  -> role classifier compares the address with public Task #1 participants
  -> Wagmi/Viem public transport reads C2FLR + FTestXRP balances on Coston2

Creator exact-approval path
  -> public transport reads balanceOf + allowance
  -> role/network/balance guards must pass
  -> useSimulateContract runs approve(V2, 1_000_000) as eth_call
  -> useEstimateGas estimates the exact prepared calldata
  -> user verifies token, spender, chain and amount
  -> injected wallet displays and signs only after explicit confirmation
  -> public RPC waits for the receipt
  -> frontend decodes the exact Approval event and refreshes allowance
```

The address-to-ABI mapping is explicit: historical V1 and current V2 are
different deployments and are never decoded interchangeably. The browser
wallet keeps custody of all key material; neither the static bundle nor
Cloudflare receives a private key. ERC-20 `approve` changes allowance only; it
is distinct from TaskBounty `approveTask`, which completes submitted work and
pays the worker. The hosting decision and future backend boundary are documented in
[`frontend-hosting.md`](frontend-hosting.md).
