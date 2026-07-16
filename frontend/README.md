# Frontend

Reserved for the wallet-connected TaskBounty web application.

The first frontend milestone will connect to Coston2 and provide:

1. Wallet and network status.
2. C2FLR and FTestXRP balances.
3. V2 contract version, `totalEscrowed`, and task reads.
4. URI retrieval and Keccak-256 verification against `metadataHash` and
   `resultHash` before display or approval.
5. FTestXRP approval and task creation with an immutable task manifest.
6. Task acceptance, immutable result submission, approval, and cancellation.
7. Transaction and contract links to the Coston2 explorer.

The live V2 Coston2 deployment is
`0x26281308BE46D9b499579CC8776615C69f29826F`. V2 Task #1 completed the
full immutable-artifact escrow flow. The frontend must map this address to the
V2 ABI and retain `0x6B98...4043` as an explicitly labeled V1 historical
deployment rather than attempting to decode both addresses with one ABI.
