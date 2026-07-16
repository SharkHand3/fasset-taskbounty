# Backend / Indexer

Reserved for the event indexer and read API.

This component was not required for the first Coston2 transaction flow. It
will persist TaskBounty events, maintain a synchronization checkpoint, select
the ABI by deployment version, retrieve and verify artifact hashes, and serve
query-friendly task and completion records to the frontend.

The completion record is generated after approval from public receipts,
`TaskCompleted`, the reward-token `Transfer`, contract state, and balances. It
is separate from the worker's immutable result manifest, so a submission never
needs to predict its future approval transaction hash.
