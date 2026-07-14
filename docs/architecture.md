# Architecture

```text
Browser wallet
    |
    | JSON-RPC reads and signed transactions
    v
Flare Testnet Coston2
    |-- FTestXRP ERC-20
    `-- TaskBounty escrow contract
             |
             | events
             v
       Backend / indexer (later milestone)
             |
             v
       Query API / database
```

## Deployment surfaces

| Component | Initial environment | Status |
|---|---|---|
| Solidity contracts | Foundry / Coston2 | Contract and deployment script ready |
| Reward asset | Coston2 FTestXRP | Official address configured |
| Frontend | Local, then public static hosting | Placeholder |
| Backend/indexer | Local service | Deferred until the direct chain flow works |
| Source and documentation | [GitHub](https://github.com/SharkHand3/fasset-taskbounty) | Published on `main` |
| Hackathon submission | DoraHacks BUIDL | Registration complete; submission pending |

## MVP transaction flow

```text
Creator approves FTestXRP
  -> Creator creates task and deposits reward
  -> Worker accepts task
  -> Worker submits result URI
  -> Creator approves work
  -> TaskBounty transfers FTestXRP to worker
```
