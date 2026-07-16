# Artifact Integrity and Evidence Model

TaskBounty V2 separates three artifacts that were combined in the first
Coston2 demo:

1. **Task manifest** — what the creator requires before a worker accepts.
2. **Result manifest** — the exact work the worker submits before approval.
3. **Completion record** — transaction and payment evidence generated after
   approval from public chain data.

The result manifest must not require a future approval transaction hash. That
hash does not exist when `submitWork` is called and belongs in the completion
record instead.

## V1 problem and V2 decision

Task #1 used a mutable GitHub `main` URL as `resultURI` so the document could
be updated with the later `approveTask` transaction. That was a practical
testnet workaround, but the on-chain URI did not bind the submission to one
exact file version.

V2 records both a retrieval URI and a Keccak-256 commitment:

```solidity
createTask(reward, metadataURI, metadataHash)
submitWork(taskId, resultURI, resultHash)
```

The URI tells clients where to retrieve an artifact. The hash tells them which
exact bytes were committed on-chain. A frontend or indexer fetches the bytes,
computes Keccak-256, and rejects the artifact if the value does not match the
on-chain commitment.

The contract cannot fetch HTTP, IPFS, or Arweave content itself. It stores the
commitment but off-chain clients perform retrieval and verification.

## Recommended workflow

```text
Creator writes final task manifest
  -> uploads it to content-addressed or version-pinned storage
  -> computes Keccak-256 of the exact bytes
  -> createTask(reward, metadataURI, metadataHash)

Worker accepts the task
  -> writes a result manifest that references exact deliverables
  -> uploads it to content-addressed or version-pinned storage
  -> computes Keccak-256 of the exact bytes
  -> submitWork(taskId, resultURI, resultHash)

Creator/client retrieves and verifies resultHash
  -> approves the committed result
  -> TaskBounty releases escrow

Indexer reads TaskCompleted and ERC-20 Transfer
  -> builds a completion record from public chain data
```

No artifact needs to contain its own future transaction hash, and no mutable
branch URL is required for the submitted result.

## Task manifest example

```json
{
  "schemaVersion": "2.0",
  "title": "Implement an FAsset escrow frontend",
  "description": "Build the read-only task page and wallet transaction flow.",
  "deliverables": [
    "Source commit",
    "Test report",
    "Deployment URL"
  ],
  "acceptanceCriteria": [
    "The UI verifies the configured chain ID",
    "Displayed artifacts match their on-chain Keccak-256 hashes",
    "No private key is stored by the frontend"
  ],
  "reward": {
    "tokenAddress": "0x0b6A3645c240605887a5532109323A3E12273dc7",
    "rawAmount": "1000000",
    "decimals": 6
  }
}
```

The manifest is finalized before `createTask`. Acceptance evidence generated
after completion is intentionally not one of its worker deliverables.

## Result manifest example

```json
{
  "schemaVersion": "2.0",
  "taskId": "2",
  "worker": "0x149e8a5BdF5FdDec7CA1163aefC0bBfF91C9DcAd",
  "summary": "Implemented and tested the requested frontend flow.",
  "artifacts": [
    {
      "name": "Source code",
      "uri": "https://github.com/example/project/tree/0123456789abcdef",
      "commit": "0123456789abcdef"
    },
    {
      "name": "Test report",
      "uri": "ipfs://bafyExampleTestReportCid"
    }
  ]
}
```

This manifest is finalized before `submitWork`. The creator approves this
exact committed version, not whatever happens to be latest later.

## Completion record example

The backend/indexer can derive this record after approval:

```json
{
  "schemaVersion": "1.0",
  "chainId": 114,
  "taskBounty": "0xNewV2Deployment",
  "taskId": "2",
  "metadataURI": "ipfs://bafyTaskManifestCid",
  "metadataHash": "0x...",
  "resultURI": "ipfs://bafyResultManifestCid",
  "resultHash": "0x...",
  "submitTransaction": "0x...",
  "approvalTransaction": "0x...",
  "status": "Completed",
  "payment": {
    "token": "0x0b6A3645c240605887a5532109323A3E12273dc7",
    "from": "0xNewV2Deployment",
    "to": "0xWorker",
    "rawAmount": "1000000"
  }
}
```

The chain remains the source of truth. The record is a query-friendly view
that can always be regenerated from receipts, events, contract state, and
token balances.

## Computing the commitment in Git Bash

V2 defines each content hash as Keccak-256 of the **exact retrieved file
bytes**. Line endings and trailing newlines are part of those bytes.
The repository's `.gitattributes` pins JSON, Markdown, Solidity, TOML, and
shell files to LF line endings so Git Bash hashes match the bytes served by a
Git commit Raw URL after a clean checkout.

Using `xxd` and Foundry Cast in Git Bash avoids shell command substitution
removing trailing newlines:

```bash
FILE=docs/examples/task-manifest-v2.example.json
CONTENT_HEX=$(xxd -p -c 999999 "$FILE" | tr -d '\n')
CONTENT_HASH=$(cast keccak "0x$CONTENT_HEX")
echo "$CONTENT_HASH"
```

Do not substitute SHA3-256 for Keccak-256; they are related but different hash
functions. The uploader and verifier must hash the same exact bytes.

Runnable templates are available in [`examples/`](examples/). Copy a template
to a new final file, replace all placeholders, validate the JSON, and only then
compute its commitment. Editing the file after hashing creates a different
artifact and requires a new hash.

## URI choices

Recommended:

| URI type | Integrity property | Availability note |
|---|---|---|
| `ipfs://<CID>` | Content-addressed | Pin on multiple providers/nodes |
| `ar://<transaction-id>` | Immutable transaction reference | Intended for long-term storage |
| Git commit Raw URL | Version-pinned | Depends on repository availability |
| Versioned object storage URL | Provider-specific immutable version | Depends on provider and access policy |

Avoid mutable branch URLs such as `/main/` for new task and result manifests.
If a mutable URL is unavoidable, the on-chain hash still detects content
replacement, but old bytes must remain available somewhere for retrieval.

## Escrow accounting hardening

V2 also adds `totalEscrowed`, the total reward-token liability for all active
tasks. It increases after an exact deposit and decreases before a completed
payment or cancellation refund.

`createTask` checks the token balance before and after `transferFrom` and
reverts unless the contract receives exactly `reward`. This rejects
fee-on-transfer tokens that would otherwise create an underfunded task.

The deployment should still use a reviewed, non-rebasing reward token. Direct
token donations can make the contract balance greater than `totalEscrowed`,
but they do not create task liabilities.

## Version and compatibility

- The completed Coston2 Task #1 contract at `0x6B98...4043` is V1 and remains
  valid historical evidence.
- The source on `main` is now V2 and has a breaking ABI/event change.
- A new V2 deployment is required before the frontend sends V2 transactions.
- An indexer must select the correct ABI by deployment address/version.

V2 improves artifact integrity and escrow accounting. It does not yet add
deadlines, revision requests, disputes, arbitration, or timeout claims; those
require explicit product and trust-policy decisions rather than being hidden
inside the artifact model change.
