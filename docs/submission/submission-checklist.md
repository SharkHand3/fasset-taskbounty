# Flare Summer Signal submission checklist

Last verified against the organizer page: **2026-07-24**
Submission opens: **2026-06-28 20:00**
Displayed deadline: **2026-08-14 19:59**
The DoraHacks page does not label the displayed time zone in the content we
verified. Treat the deadline as a hard latest bound and submit at least 24 hours
early.

## Organizer-required fields

| Requirement | Prepared source | Status |
|---|---|---|
| Project name | `FAsset TaskBounty` in [submission copy](dorahacks-submission.md#project-name) | Ready |
| Bounty | Bounty 1 — Interoperable Asset Products | Ready |
| Short description | [Submission copy](dorahacks-submission.md#short-description) | Ready |
| Target user | [Submission copy](dorahacks-submission.md#target-users) | Ready |
| Demo, video, or app link | Live app is ready; final video URL requires user recording/upload | Partially ready |
| GitHub or technical materials | Repository, architecture, API, and evidence links are prepared | Ready |
| How the project uses Flare | [Flare integration section](dorahacks-submission.md#how-it-uses-flare) | Ready |
| What was newly built, ported, integrated, or improved | [New-work evidence](new-work-evidence.md) | Ready |
| Smart-contract addresses and deployment | [Deployment table](dorahacks-submission.md#smart-contracts-and-deployments) | Ready |
| Short roadmap | [Roadmap](dorahacks-submission.md#short-roadmap) | Ready |

## Technical release gate

- [x] `contracts`: all Foundry tests pass, including fuzz tests.
- [x] `frontend`: ESLint, TypeScript, Vitest, and static production build pass.
- [x] `backend`: ESLint, TypeScript, Vitest, and Wrangler dry-run build pass.
- [x] Backend and non-optional frontend production dependency audits have no
  known vulnerability. The optional, non-deployed Sharp build-tree advisory is
  documented in [`SECURITY.md`](../../SECURITY.md) and becomes release-blocking
  if server rendering or runtime image optimization is introduced.
- [x] Production API and public Coston2 RPC match at the API's confirmed
  snapshot block.
- [x] Live home, marketplace, create, and Task #1 pages load without browser
  warning/error logs or horizontal overflow; home and Task #1 also pass at a
  390 x 844 mobile viewport.
- [x] Task #1 reports `Completed`; task and result artifacts report verified.
- [x] Live `/v1/health`, `/v1/protocol`, `/v1/tasks`, and `/v1/tasks/1`
  endpoints return the expected deployment identity and data.
- [x] README and submission-package local Markdown links resolve.
- [x] Repository contains no `.env`, private key, recovery phrase, keystore,
  password, authentication token, or wallet signature.

Do not mark these boxes from memory. Update them only after the final release
commands and browser acceptance run have completed.

## Evidence assets

- [x] Product cover image is stored in `docs/assets/submission/` and renders in
  the repository.
- [x] Home/protocol screenshot is current.
- [x] Completed Task #1 and artifact-verification screenshot is current.
- [x] Architecture image or Mermaid diagram is readable without private data.
- [ ] Demo recording follows [demo-script.md](demo-script.md).
- [ ] Video is public and viewable while signed out.
- [ ] Video description links the live app, GitHub repository, contract, and
  approval transaction.

## Claim-safety gate

- [x] Say **Coston2 testnet**, not mainnet.
- [x] Say **official Coston2 FTestXRP token used as the reward asset**; do not
  claim the app mints FAssets.
- [x] Do not claim direct FDC integration. FAssets relies on Flare protocols,
  while this application composes the resulting ERC-20 asset.
- [x] Describe D1 as a rebuildable read projection, not the ledger.
- [x] Describe the system as a non-custodial platform using smart-contract
  escrow; do not imply that no component ever holds tokens.
- [x] Do not claim an audit, production users, partnerships, revenue, mainnet
  readiness, or metrics that do not exist.
- [x] Distinguish the pre-program learning scaffold from the work listed in
  [new-work-evidence.md](new-work-evidence.md).

## User-only final actions

These actions require the user's identity, account, or judgment and must not be
delegated to automation:

1. Record the narration in [demo-script.md](demo-script.md), edit the video,
   upload it, and verify the public link while signed out.
2. Sign in to DoraHacks and open the Flare Summer Signal BUIDL submission form.
3. Paste the reviewed sections from
   [dorahacks-submission.md](dorahacks-submission.md), upload the prepared cover
   and screenshots, and add the final video URL.
4. Preview every field, confirm the selected bounty, and test every public link.
5. Submit before **2026-08-14 19:59 as displayed by DoraHacks**, preferably at
   least 24 hours early because the page did not expose a time-zone label in
   the verified content.

No wallet signature is required for the documented read-only acceptance run.
If the organizer later requires a wallet signature or any new state-changing
demo transaction, the user must inspect and approve it in their own wallet.
