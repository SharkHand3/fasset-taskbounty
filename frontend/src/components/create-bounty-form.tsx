"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  decodeEventLog,
  encodeFunctionData,
  formatUnits,
  keccak256,
  toBytes,
  type Address,
  type Hex,
  zeroAddress,
} from "viem";
import {
  useConnection,
  useEstimateGas,
  useReadContract,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import {
  activeDeployment,
  rewardTokenAddress,
  rewardTokenDecimals,
  rewardTokenSymbol,
} from "@/config/deployments";
import { coston2 } from "@/config/network";
import {
  erc20ApprovalEventAbi,
  erc20ApproveAbi,
  erc20ReadAbi,
} from "@/lib/abi/erc20";
import { taskBountyV2Abi } from "@/lib/abi/task-bounty-v2";
import { fetchAndVerifyJsonArtifact } from "@/lib/artifact-verification";
import {
  createTaskManifestDraft,
  getManifestPublishingError,
  parseTaskManifest,
  type TaskManifestView,
} from "@/lib/task-manifest";
import {
  canSendReviewedTransaction,
  createPublishingIntentKey,
  parseContentHash,
  parseRewardInput,
} from "@/lib/task-publishing";
import { getWalletNetworkState } from "@/lib/wallet-identity";

import styles from "./create-bounty-form.module.css";

type ArtifactState = "idle" | "checking" | "verified" | "mismatch" | "error";

interface ArtifactCheck {
  byteLength?: number;
  message?: string;
  state: ArtifactState;
  title?: string;
  verifiedKey?: string;
}

interface ApprovalSubmission {
  account: Address;
  amount: bigint;
  hash: Hex;
}

interface CreationSubmission {
  account: Address;
  hash: Hex;
  metadataHash: Hex;
  metadataURI: string;
  reward: bigint;
  taskId: bigint;
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function errorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("name" in error && error.name === "UserRejectedRequestError") {
    return "The wallet request was rejected. Nothing was broadcast and no gas was spent.";
  }
  if ("shortMessage" in error && typeof error.shortMessage === "string") {
    return error.shortMessage;
  }
  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "The requested action did not complete.";
}

function shortHash(value: string): string {
  return value.length > 28 ? `${value.slice(0, 16)}…${value.slice(-10)}` : value;
}

export function CreateBountyForm() {
  const connection = useConnection();
  const account = connection.address ?? zeroAddress;
  const networkState = getWalletNetworkState(connection.chainId);

  const [rewardInput, setRewardInput] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [metadataHashInput, setMetadataHashInput] = useState("");
  const [artifactCheck, setArtifactCheck] = useState<ArtifactCheck>({ state: "idle" });

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftDeliverables, setDraftDeliverables] = useState("");
  const [draftCriteria, setDraftCriteria] = useState("");
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [generatedHash, setGeneratedHash] = useState<Hex | null>(null);

  const [approvalSimulationKey, setApprovalSimulationKey] = useState<string | null>(null);
  const [creationSimulationKey, setCreationSimulationKey] = useState<string | null>(null);
  const [approvalReviewedKey, setApprovalReviewedKey] = useState<string | null>(null);
  const [creationReviewedKey, setCreationReviewedKey] = useState<string | null>(null);
  const [approvalSubmission, setApprovalSubmission] = useState<ApprovalSubmission | null>(null);
  const [creationSubmission, setCreationSubmission] = useState<CreationSubmission | null>(null);
  const refreshedReceipts = useRef<Set<Hex>>(new Set());

  const reward = useMemo(() => parseRewardInput(rewardInput), [rewardInput]);
  const metadataHash = useMemo(
    () => parseContentHash(metadataHashInput),
    [metadataHashInput],
  );
  const artifactKey = `${metadataURI.trim()}:${metadataHash?.toLowerCase() ?? "invalid"}:${reward?.toString() ?? "invalid-reward"}`;

  const balance = useReadContract({
    abi: erc20ReadAbi,
    address: rewardTokenAddress,
    args: [account],
    chainId: coston2.id,
    functionName: "balanceOf",
    query: { enabled: connection.isConnected },
  });
  const allowance = useReadContract({
    abi: erc20ReadAbi,
    address: rewardTokenAddress,
    args: [account, activeDeployment.address],
    chainId: coston2.id,
    functionName: "allowance",
    query: { enabled: connection.isConnected },
  });
  const nextTaskId = useReadContract({
    abi: taskBountyV2Abi,
    address: activeDeployment.address,
    chainId: coston2.id,
    functionName: "nextTaskId",
    query: { enabled: connection.isConnected },
  });
  const totalEscrowed = useReadContract({
    abi: taskBountyV2Abi,
    address: activeDeployment.address,
    chainId: coston2.id,
    functionName: "totalEscrowed",
    query: { enabled: connection.isConnected },
  });

  const refreshPublicState = useCallback(() => {
    void Promise.all([
      balance.refetch(),
      allowance.refetch(),
      nextTaskId.refetch(),
      totalEscrowed.refetch(),
    ]);
  }, [allowance, balance, nextTaskId, totalEscrowed]);

  const formReady =
    reward !== null &&
    metadataHash !== null &&
    metadataURI.trim().length > 0 &&
    artifactCheck.state === "verified" &&
    artifactCheck.verifiedKey === artifactKey;
  const publicStateReady =
    connection.isConnected &&
    networkState === "coston2" &&
    balance.data !== undefined &&
    allowance.data !== undefined &&
    nextTaskId.data !== undefined;
  const hasEnoughBalance = reward !== null && balance.data !== undefined && balance.data >= reward;
  const exactAllowance = reward !== null && allowance.data === reward;

  const intentKey =
    reward && metadataHash
      ? createPublishingIntentKey({
          account,
          allowance: allowance.data,
          chainId: connection.chainId,
          metadataHash,
          metadataURI,
          nextTaskId: nextTaskId.data,
          reward,
        })
      : "invalid-intent";

  const approvalRequested =
    formReady &&
    publicStateReady &&
    hasEnoughBalance &&
    !exactAllowance &&
    approvalSimulationKey === intentKey;
  const approvalSimulation = useSimulateContract({
    abi: erc20ApproveAbi,
    account,
    address: rewardTokenAddress,
    args: [activeDeployment.address, reward ?? 0n],
    chainId: coston2.id,
    functionName: "approve",
    query: { enabled: approvalRequested },
  });
  const approvalCalldata = encodeFunctionData({
    abi: erc20ApproveAbi,
    args: [activeDeployment.address, reward ?? 0n],
    functionName: "approve",
  });
  const approvalGas = useEstimateGas({
    account,
    chainId: coston2.id,
    data: approvalCalldata,
    to: rewardTokenAddress,
    query: { enabled: approvalRequested && approvalSimulation.isSuccess },
  });
  const approvalWrite = useWriteContract();
  const approvalReceipt = useWaitForTransactionReceipt({
    chainId: coston2.id,
    hash: approvalSubmission?.hash,
    query: { enabled: approvalSubmission !== null },
  });

  const creationRequested =
    formReady &&
    publicStateReady &&
    hasEnoughBalance &&
    exactAllowance &&
    creationSimulationKey === intentKey;
  const creationSimulation = useSimulateContract({
    abi: taskBountyV2Abi,
    account,
    address: activeDeployment.address,
    args: [reward ?? 0n, metadataURI.trim(), metadataHash ?? (`0x${"00".repeat(32)}` as Hex)],
    chainId: coston2.id,
    functionName: "createTask",
    query: { enabled: creationRequested },
  });
  const creationPredictionMatches =
    creationSimulation.isSuccess && creationSimulation.data.result === nextTaskId.data;
  const creationCalldata = encodeFunctionData({
    abi: taskBountyV2Abi,
    args: [reward ?? 0n, metadataURI.trim(), metadataHash ?? (`0x${"00".repeat(32)}` as Hex)],
    functionName: "createTask",
  });
  const creationGas = useEstimateGas({
    account,
    chainId: coston2.id,
    data: creationCalldata,
    to: activeDeployment.address,
    query: { enabled: creationRequested && creationPredictionMatches },
  });
  const creationWrite = useWriteContract();
  const creationReceipt = useWaitForTransactionReceipt({
    chainId: coston2.id,
    hash: creationSubmission?.hash,
    query: { enabled: creationSubmission !== null },
  });

  const approvalEventConfirmed = useMemo(() => {
    if (!approvalReceipt.data || !approvalSubmission) return false;
    return approvalReceipt.data.logs.some((log) => {
      if (log.address.toLowerCase() !== rewardTokenAddress.toLowerCase()) return false;
      try {
        const decoded = decodeEventLog({
          abi: erc20ApprovalEventAbi,
          data: log.data,
          topics: log.topics,
        });
        return (
          decoded.eventName === "Approval" &&
          decoded.args.owner.toLowerCase() === approvalSubmission.account.toLowerCase() &&
          decoded.args.spender.toLowerCase() === activeDeployment.address.toLowerCase() &&
          decoded.args.value === approvalSubmission.amount
        );
      } catch {
        return false;
      }
    });
  }, [approvalReceipt.data, approvalSubmission]);

  const creationEventConfirmed = useMemo(() => {
    if (!creationReceipt.data || !creationSubmission) return false;
    return creationReceipt.data.logs.some((log) => {
      if (log.address.toLowerCase() !== activeDeployment.address.toLowerCase()) return false;
      try {
        const decoded = decodeEventLog({
          abi: taskBountyV2Abi,
          data: log.data,
          topics: log.topics,
        });
        return (
          decoded.eventName === "TaskCreated" &&
          decoded.args.taskId === creationSubmission.taskId &&
          decoded.args.creator.toLowerCase() === creationSubmission.account.toLowerCase() &&
          decoded.args.reward === creationSubmission.reward &&
          decoded.args.metadataHash.toLowerCase() === creationSubmission.metadataHash.toLowerCase() &&
          decoded.args.metadataURI === creationSubmission.metadataURI
        );
      } catch {
        return false;
      }
    });
  }, [creationReceipt.data, creationSubmission]);

  useEffect(() => {
    const hashes = [
      approvalReceipt.isSuccess ? approvalSubmission?.hash : undefined,
      creationReceipt.isSuccess ? creationSubmission?.hash : undefined,
    ].filter((hash): hash is Hex => hash !== undefined);
    const unseen = hashes.filter((hash) => !refreshedReceipts.current.has(hash));
    if (unseen.length === 0) return;
    unseen.forEach((hash) => refreshedReceipts.current.add(hash));
    refreshPublicState();
  }, [
    approvalReceipt.isSuccess,
    approvalSubmission?.hash,
    creationReceipt.isSuccess,
    creationSubmission?.hash,
    refreshPublicState,
  ]);

  async function verifyManifest() {
    if (!metadataHash || metadataURI.trim().length === 0) return;
    const checkedKey = artifactKey;
    setArtifactCheck({ state: "checking" });
    try {
      const result = await fetchAndVerifyJsonArtifact<TaskManifestView>(
        metadataURI.trim(),
        metadataHash,
        parseTaskManifest,
      );
      if (!result.matches) {
        setArtifactCheck({
          byteLength: result.byteLength,
          message: `Retrieved bytes hash to ${result.actualHash}`,
          state: "mismatch",
        });
        return;
      }
      const publishingError = reward
        ? getManifestPublishingError(result.data, reward)
        : "Enter a valid transaction reward first.";
      setArtifactCheck(
        publishingError
          ? { message: publishingError, state: "error" }
          : {
              byteLength: result.byteLength,
              state: "verified",
              title: result.data.title,
              verifiedKey: checkedKey,
            },
      );
    } catch (error) {
      setArtifactCheck({
        message: errorMessage(error) ?? "Manifest verification failed.",
        state: "error",
      });
    }
  }

  function buildDraft() {
    if (!reward || !draftTitle.trim() || !draftDescription.trim()) return;
    const json = createTaskManifestDraft({
      acceptanceCriteria: splitLines(draftCriteria),
      deliverables: splitLines(draftDeliverables),
      description: draftDescription,
      reward: reward.toString(),
      title: draftTitle,
    });
    const hash = keccak256(toBytes(json));
    setGeneratedDraft(json);
    setGeneratedHash(hash);
    setMetadataHashInput(hash);
    setArtifactCheck({ state: "idle" });
  }

  function invalidateGeneratedDraft() {
    setGeneratedDraft(null);
    setGeneratedHash(null);
  }

  function downloadDraft() {
    if (!generatedDraft) return;
    const url = URL.createObjectURL(new Blob([generatedDraft], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "task-manifest.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function requestApprovalSimulation() {
    approvalWrite.reset();
    setApprovalSubmission(null);
    setApprovalReviewedKey(null);
    if (approvalSimulationKey === intentKey) {
      void approvalSimulation.refetch();
    } else {
      setApprovalSimulationKey(intentKey);
    }
  }

  function sendApproval() {
    if (!approvalSimulation.data?.request || !connection.address || !reward) return;
    approvalWrite.mutate(approvalSimulation.data.request, {
      onSuccess(hash) {
        setApprovalSubmission({ account: connection.address as Address, amount: reward, hash });
      },
    });
  }

  function requestCreationSimulation() {
    creationWrite.reset();
    setCreationSubmission(null);
    setCreationReviewedKey(null);
    if (creationSimulationKey === intentKey) {
      void creationSimulation.refetch();
    } else {
      setCreationSimulationKey(intentKey);
    }
  }

  function sendCreation() {
    if (
      !creationSimulation.data?.request ||
      !connection.address ||
      !reward ||
      !metadataHash ||
      nextTaskId.data === undefined
    ) return;
    const submission: Omit<CreationSubmission, "hash"> = {
      account: connection.address as Address,
      metadataHash,
      metadataURI: metadataURI.trim(),
      reward,
      taskId: nextTaskId.data,
    };
    creationWrite.mutate(creationSimulation.data.request, {
      onSuccess(hash) {
        setCreationSubmission({ ...submission, hash });
      },
    });
  }

  const canApprove = canSendReviewedTransaction({
    gasReady: approvalGas.isSuccess,
    hasSubmission: approvalSubmission !== null,
    reviewed: approvalReviewedKey === intentKey,
    simulationReady: approvalSimulation.isSuccess,
    writePending: approvalWrite.isPending,
  });
  const canCreate = canSendReviewedTransaction({
    gasReady: creationGas.isSuccess,
    hasSubmission: creationSubmission !== null,
    reviewed: creationReviewedKey === intentKey,
    simulationReady: creationPredictionMatches,
    writePending: creationWrite.isPending,
  });

  const actionError =
    errorMessage(balance.error) ??
    errorMessage(allowance.error) ??
    errorMessage(nextTaskId.error) ??
    errorMessage(totalEscrowed.error) ??
    errorMessage(approvalSimulation.error) ??
    errorMessage(approvalGas.error) ??
    errorMessage(approvalWrite.error) ??
    errorMessage(approvalReceipt.error) ??
    errorMessage(creationSimulation.error) ??
    errorMessage(creationGas.error) ??
    errorMessage(creationWrite.error) ??
    errorMessage(creationReceipt.error);

  return (
    <div className={styles.flow}>
      <section className={styles.intro}>
        <p>Publish a bounty</p>
        <h1>Turn a work brief into a funded on-chain agreement.</h1>
        <span>
          Define the work off-chain, verify the exact manifest bytes, approve only the
          selected reward, then deposit that reward into TaskBounty escrow.
        </span>
      </section>

      <section className={styles.card}>
        <div className={styles.heading}>
          <div><span>Step 1</span><h2>Prepare the task manifest</h2></div>
          <strong>Off-chain content</strong>
        </div>
        <p className={styles.explainer}>
          The contract should not store a long brief. It stores a URI for retrieval and a
          Keccak-256 hash that commits to the exact UTF-8 bytes.
        </p>
        <div className={styles.formGrid}>
          <label><span>Title</span><input onChange={(event) => { setDraftTitle(event.target.value); invalidateGeneratedDraft(); }} placeholder="Example: Build an analytics dashboard" value={draftTitle} /></label>
          <label><span>Reward ({rewardTokenSymbol})</span><input inputMode="decimal" onChange={(event) => { setRewardInput(event.target.value); setArtifactCheck({ state: "idle" }); invalidateGeneratedDraft(); }} placeholder="1.5" value={rewardInput} /></label>
          <label className={styles.full}><span>Description</span><textarea onChange={(event) => { setDraftDescription(event.target.value); invalidateGeneratedDraft(); }} placeholder="Describe the outcome, constraints, and context." rows={4} value={draftDescription} /></label>
          <label><span>Deliverables — one per line</span><textarea onChange={(event) => { setDraftDeliverables(event.target.value); invalidateGeneratedDraft(); }} placeholder="Source repository\nDeployment URL" rows={5} value={draftDeliverables} /></label>
          <label><span>Acceptance criteria — one per line</span><textarea onChange={(event) => { setDraftCriteria(event.target.value); invalidateGeneratedDraft(); }} placeholder="Automated checks pass\nDocumentation is complete" rows={5} value={draftCriteria} /></label>
        </div>
        <div className={styles.actions}>
          <button disabled={!reward || !draftTitle.trim() || !draftDescription.trim()} onClick={buildDraft} type="button">Generate deterministic JSON</button>
          <button className={styles.secondary} disabled={!generatedDraft} onClick={downloadDraft} type="button">Download manifest</button>
        </div>
        {generatedDraft && generatedHash && (
          <div className={styles.generated}>
            <span>Locally computed content hash</span>
            <code>{generatedHash}</code>
            <p>Upload this exact downloaded file to immutable storage or a version-pinned URL. Editing even one byte produces a different hash.</p>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.heading}>
          <div><span>Step 2</span><h2>Verify the published artifact</h2></div>
          <strong>Signing gate</strong>
        </div>
        <div className={styles.formGrid}>
          <label className={styles.full}><span>Version-pinned or content-addressed URI</span><input onChange={(event) => { setMetadataURI(event.target.value); setArtifactCheck({ state: "idle" }); }} placeholder="ipfs://… or https://…/commit/task-manifest.json" value={metadataURI} /></label>
          <label className={styles.full}><span>Keccak-256 content hash</span><input onChange={(event) => { setMetadataHashInput(event.target.value); setArtifactCheck({ state: "idle" }); }} placeholder={`0x${"00".repeat(32)}`} value={metadataHashInput} /></label>
        </div>
        <div className={styles.verifyRow}>
          <div><span>Artifact status</span><strong>{artifactCheck.state === "idle" && "Not verified"}{artifactCheck.state === "checking" && "Retrieving exact bytes…"}{artifactCheck.state === "verified" && `${artifactCheck.title} · ${artifactCheck.byteLength?.toLocaleString()} bytes`}{artifactCheck.state === "mismatch" && "Hash mismatch — signing blocked"}{artifactCheck.state === "error" && "Artifact unavailable or invalid"}</strong>{artifactCheck.message && <small>{artifactCheck.message}</small>}</div>
          <button disabled={!metadataHash || !metadataURI.trim() || artifactCheck.state === "checking"} onClick={() => void verifyManifest()} type="button">Verify exact bytes</button>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.heading}>
          <div><span>Step 3</span><h2>Fund and publish</h2></div>
          <strong>Coston2 · chainId 114</strong>
        </div>
        <div className={styles.metrics}>
          <article><span>Wallet balance</span><strong>{balance.data === undefined ? "—" : `${formatUnits(balance.data, rewardTokenDecimals)} ${rewardTokenSymbol}`}</strong></article>
          <article><span>Current allowance</span><strong>{allowance.data === undefined ? "—" : `${formatUnits(allowance.data, rewardTokenDecimals)} ${rewardTokenSymbol}`}</strong></article>
          <article><span>Predicted task ID</span><strong>{nextTaskId.data === undefined ? "—" : `#${nextTaskId.data}`}</strong></article>
          <article><span>Active escrow</span><strong>{totalEscrowed.data === undefined ? "—" : `${formatUnits(totalEscrowed.data, rewardTokenDecimals)} ${rewardTokenSymbol}`}</strong></article>
        </div>

        {!connection.isConnected && <div className={styles.notice}>Connect a wallet below before preparing a transaction.</div>}
        {connection.isConnected && networkState !== "coston2" && <div className={styles.notice}>Switch the wallet to Coston2 before preparing a transaction.</div>}
        {publicStateReady && formReady && !hasEnoughBalance && <div className={styles.notice}>This account does not have enough {rewardTokenSymbol} for the selected reward.</div>}

        <div className={styles.transactionStep}>
          <div className={styles.transactionHeading}><div><span>Transaction A</span><h3>Set an exact token allowance</h3></div><strong>{exactAllowance ? "Ready" : "Required when amount differs"}</strong></div>
          <p><code>approve(TaskBounty, reward)</code> authorizes the escrow contract; it does not move tokens.</p>
          <div className={styles.actions}>
            <button disabled={!formReady || !publicStateReady || !hasEnoughBalance || exactAllowance || (approvalRequested && approvalSimulation.isPending)} onClick={requestApprovalSimulation} type="button">{approvalRequested && approvalSimulation.isPending ? "Simulating…" : "Simulate exact approval"}</button>
            <span>{approvalSimulation.isSuccess && `Simulation passed · gas ${approvalGas.data?.toLocaleString() ?? "estimating"}`}</span>
          </div>
          {approvalSimulation.isSuccess && approvalGas.isSuccess && !exactAllowance && (
            <label className={styles.review}><input checked={approvalReviewedKey === intentKey} onChange={(event) => setApprovalReviewedKey(event.target.checked ? intentKey : null)} type="checkbox" /><span>I checked the token, spender contract, network, and exact {rewardInput} {rewardTokenSymbol} allowance.</span></label>
          )}
          <button className={styles.walletButton} disabled={!canApprove} onClick={sendApproval} type="button">Open wallet for exact approval</button>
          {approvalSubmission && <div className={styles.receipt}><a href={`${coston2.blockExplorers.default.url}/tx/${approvalSubmission.hash}`} rel="noreferrer" target="_blank">{shortHash(approvalSubmission.hash)} ↗</a><strong>{approvalReceipt.isPending && "Waiting for receipt…"}{approvalReceipt.isSuccess && approvalEventConfirmed && "Approval event verified"}{approvalReceipt.isSuccess && !approvalEventConfirmed && "Receipt succeeded; exact event not found"}</strong><button onClick={refreshPublicState} type="button">Refresh allowance</button></div>}
        </div>

        <div className={styles.transactionStep}>
          <div className={styles.transactionHeading}><div><span>Transaction B</span><h3>Create the funded bounty</h3></div><strong>{exactAllowance ? "Allowance ready" : "Waiting for exact allowance"}</strong></div>
          <p><code>createTask(reward, URI, hash)</code> transfers the exact reward into escrow and emits a permanent task ID.</p>
          <div className={styles.actions}>
            <button disabled={!formReady || !publicStateReady || !hasEnoughBalance || !exactAllowance || (creationRequested && creationSimulation.isPending)} onClick={requestCreationSimulation} type="button">{creationRequested && creationSimulation.isPending ? "Simulating…" : "Simulate bounty creation"}</button>
            <span>{creationPredictionMatches && `Predicted #${nextTaskId.data} · gas ${creationGas.data?.toLocaleString() ?? "estimating"}`}</span>
          </div>
          {creationPredictionMatches && creationGas.isSuccess && (
            <label className={styles.review}><input checked={creationReviewedKey === intentKey} onChange={(event) => setCreationReviewedKey(event.target.checked ? intentKey : null)} type="checkbox" /><span>I checked the task ID, reward, contract, URI, and content hash. I understand this transaction moves {rewardInput} {rewardTokenSymbol} into escrow.</span></label>
          )}
          <button className={styles.walletButton} disabled={!canCreate} onClick={sendCreation} type="button">Open wallet to fund and publish</button>
          {creationSubmission && <div className={styles.receipt}><a href={`${coston2.blockExplorers.default.url}/tx/${creationSubmission.hash}`} rel="noreferrer" target="_blank">{shortHash(creationSubmission.hash)} ↗</a><strong>{creationReceipt.isPending && "Waiting for receipt…"}{creationReceipt.isSuccess && creationEventConfirmed && `Task #${creationSubmission.taskId} created and event verified`}{creationReceipt.isSuccess && !creationEventConfirmed && "Receipt succeeded; exact event not found"}</strong>{creationReceipt.isSuccess && creationEventConfirmed && <a href={`/tasks/view/?id=${creationSubmission.taskId}`}>Open task →</a>}</div>}
        </div>

        {actionError && <div className={styles.error} role="alert"><strong>Transaction flow stopped safely.</strong><span>{actionError}</span></div>}
      </section>
    </div>
  );
}
