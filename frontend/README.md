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

The completed Coston2 Task #1 address uses the V1 ABI. A new V2 deployment and
address-specific ABI configuration are required before enabling write buttons.
