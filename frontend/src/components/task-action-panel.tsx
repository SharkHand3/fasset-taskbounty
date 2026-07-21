"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodeEventLog, type Address, type Hex, zeroHash } from "viem";
import {
  useConnection,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { activeDeployment } from "@/config/deployments";
import { coston2 } from "@/config/network";
import { taskBountyV2Abi } from "@/lib/abi/task-bounty-v2";
import { fetchAndVerifyArtifact } from "@/lib/artifact-verification";
import {
  getAvailableTaskAction,
  isTaskActionEvidenceReady,
  type TaskAction,
} from "@/lib/task-action";
import type { ChainTask } from "@/lib/task-reader";
import { getTaskRole } from "@/lib/task-role";
import { parseContentHash } from "@/lib/task-publishing";
import { getWalletNetworkState } from "@/lib/wallet-identity";

import styles from "./task-action-panel.module.css";

type ActionKind = TaskAction;
type VerificationState = "idle" | "checking" | "verified" | "mismatch" | "error";

interface Submission {
  account: Address;
  action: ActionKind;
  hash: Hex;
  resultHash?: Hex;
  resultURI?: string;
}

function getAction(task: ChainTask, account: Address | undefined): ActionKind | null {
  const role = getTaskRole(account, task.creator, task.worker);
  return getAvailableTaskAction(task.status, role, account !== undefined);
}

function actionCopy(action: ActionKind): { button: string; description: string; title: string } {
  switch (action) {
    case "accept":
      return {
        button: "Accept this bounty",
        description: "Assigns your connected address as worker. No reward tokens move yet.",
        title: "Accept the open task",
      };
    case "cancel":
      return {
        button: "Cancel and refund",
        description: "Closes this unassigned task and returns the full escrowed reward to the creator.",
        title: "Cancel the open task",
      };
    case "submit":
      return {
        button: "Commit work result",
        description: "Stores the result URI and exact-byte hash. Payment remains in escrow for creator review.",
        title: "Submit completed work",
      };
    case "approve":
      return {
        button: "Approve and release reward",
        description: "Finalizes the task and transfers the full escrowed reward to the assigned worker.",
        title: "Approve submitted work",
      };
  }
}

function errorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("name" in error && error.name === "UserRejectedRequestError") {
    return "The wallet request was rejected. Nothing was broadcast.";
  }
  if ("shortMessage" in error && typeof error.shortMessage === "string") return error.shortMessage;
  if ("message" in error && typeof error.message === "string") return error.message;
  return "The transaction did not complete.";
}

export function TaskActionPanel({
  onConfirmed,
  resultVerified,
  task,
}: {
  onConfirmed: () => void;
  resultVerified: boolean;
  task: ChainTask;
}) {
  const connection = useConnection();
  const account = connection.address;
  const action = getAction(task, account);
  const copy = action ? actionCopy(action) : null;
  const networkState = getWalletNetworkState(connection.chainId);
  const [resultURI, setResultURI] = useState("");
  const [resultHashInput, setResultHashInput] = useState("");
  const [verificationState, setVerificationState] = useState<VerificationState>("idle");
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verifiedArtifactKey, setVerifiedArtifactKey] = useState<string | null>(null);
  const [simulationKey, setSimulationKey] = useState<string | null>(null);
  const [reviewedKey, setReviewedKey] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const refreshedHash = useRef<Hex | null>(null);

  const resultHash = useMemo(() => parseContentHash(resultHashInput), [resultHashInput]);
  const artifactKey = `${resultURI.trim()}:${resultHash?.toLowerCase() ?? "invalid"}`;
  const intentKey = `${account?.toLowerCase() ?? "disconnected"}:${connection.chainId ?? "none"}:${task.id}:${task.status}:${action ?? "none"}:${artifactKey}`;
  const approvalEvidenceReady = isTaskActionEvidenceReady(
    action,
    resultVerified,
  );
  const baseReady = Boolean(
    action && account && networkState === "coston2" && approvalEvidenceReady,
  );
  const submitArtifactReady =
    action !== "submit" ||
    (verificationState === "verified" && verifiedArtifactKey === artifactKey);
  const simulationRequested = baseReady && submitArtifactReady && simulationKey === intentKey;

  const acceptSimulation = useSimulateContract({
    abi: taskBountyV2Abi,
    account,
    address: activeDeployment.address,
    args: [task.id],
    chainId: coston2.id,
    functionName: "acceptTask",
    query: { enabled: simulationRequested && action === "accept" },
  });
  const cancelSimulation = useSimulateContract({
    abi: taskBountyV2Abi,
    account,
    address: activeDeployment.address,
    args: [task.id],
    chainId: coston2.id,
    functionName: "cancelTask",
    query: { enabled: simulationRequested && action === "cancel" },
  });
  const approveSimulation = useSimulateContract({
    abi: taskBountyV2Abi,
    account,
    address: activeDeployment.address,
    args: [task.id],
    chainId: coston2.id,
    functionName: "approveTask",
    query: { enabled: simulationRequested && action === "approve" },
  });
  const submitSimulation = useSimulateContract({
    abi: taskBountyV2Abi,
    account,
    address: activeDeployment.address,
    args: [task.id, resultURI.trim(), resultHash ?? zeroHash],
    chainId: coston2.id,
    functionName: "submitWork",
    query: { enabled: simulationRequested && action === "submit" },
  });
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    chainId: coston2.id,
    hash: submission?.hash,
    query: { enabled: submission !== null },
  });

  const simulation =
    action === "accept"
      ? acceptSimulation
      : action === "cancel"
        ? cancelSimulation
        : action === "approve"
          ? approveSimulation
          : submitSimulation;

  const eventConfirmed = useMemo(() => {
    if (!receipt.data || !submission) return false;
    return receipt.data.logs.some((log) => {
      if (log.address.toLowerCase() !== activeDeployment.address.toLowerCase()) return false;
      try {
        const decoded = decodeEventLog({ abi: taskBountyV2Abi, data: log.data, topics: log.topics });
        if (decoded.eventName === "TaskAccepted" && submission.action === "accept") {
          return decoded.args.taskId === task.id && decoded.args.worker.toLowerCase() === submission.account.toLowerCase();
        }
        if (decoded.eventName === "TaskCancelled" && submission.action === "cancel") {
          return decoded.args.taskId === task.id && decoded.args.creator.toLowerCase() === submission.account.toLowerCase() && decoded.args.refund === task.reward;
        }
        if (decoded.eventName === "TaskCompleted" && submission.action === "approve") {
          return decoded.args.taskId === task.id && decoded.args.worker.toLowerCase() === task.worker.toLowerCase() && decoded.args.reward === task.reward;
        }
        if (decoded.eventName === "WorkSubmitted" && submission.action === "submit") {
          return decoded.args.taskId === task.id && decoded.args.worker.toLowerCase() === submission.account.toLowerCase() && decoded.args.resultHash.toLowerCase() === submission.resultHash?.toLowerCase() && decoded.args.resultURI === submission.resultURI;
        }
        return false;
      } catch {
        return false;
      }
    });
  }, [receipt.data, submission, task.id, task.reward, task.worker]);

  useEffect(() => {
    if (receipt.isSuccess && submission && refreshedHash.current !== submission.hash) {
      refreshedHash.current = submission.hash;
      onConfirmed();
    }
  }, [onConfirmed, receipt.isSuccess, submission]);

  async function verifyResult() {
    if (!resultHash || !resultURI.trim()) return;
    const checkedKey = artifactKey;
    setVerificationState("checking");
    setVerificationMessage(null);
    try {
      const result = await fetchAndVerifyArtifact(resultURI.trim(), resultHash);
      if (result.matches) {
        setVerifiedArtifactKey(checkedKey);
        setVerificationState("verified");
        setVerificationMessage(`${result.byteLength.toLocaleString()} exact bytes verified`);
      } else {
        setVerifiedArtifactKey(null);
        setVerificationState("mismatch");
        setVerificationMessage(`Retrieved bytes hash to ${result.actualHash}`);
      }
    } catch (error) {
      setVerifiedArtifactKey(null);
      setVerificationState("error");
      setVerificationMessage(errorMessage(error));
    }
  }

  function requestSimulation() {
    write.reset();
    setSubmission(null);
    setReviewedKey(null);
    if (simulationKey === intentKey) void simulation.refetch();
    else setSimulationKey(intentKey);
  }

  function sendTransaction() {
    if (!action || !account) return;
    const onSuccess = (hash: Hex) => {
      setSubmission({
        account,
        action,
        hash,
        resultHash: action === "submit" ? resultHash ?? undefined : undefined,
        resultURI: action === "submit" ? resultURI.trim() : undefined,
      });
    };

    if (action === "accept" && acceptSimulation.data?.request) {
      write.mutate(acceptSimulation.data.request, { onSuccess });
    } else if (action === "cancel" && cancelSimulation.data?.request) {
      write.mutate(cancelSimulation.data.request, { onSuccess });
    } else if (action === "approve" && approveSimulation.data?.request) {
      write.mutate(approveSimulation.data.request, { onSuccess });
    } else if (action === "submit" && submitSimulation.data?.request) {
      write.mutate(submitSimulation.data.request, { onSuccess });
    }
  }

  if (!connection.isConnected) {
    return <article className={styles.panel}><span>Transaction actions</span><h2>Connect a wallet to continue</h2><p>Public task data stays visible without a wallet. Connect below only when you want to perform a role-authorized action.</p></article>;
  }

  if (!action) {
    return <article className={styles.panel}><span>Transaction actions</span><h2>No action for this account</h2><p>The current task status and your task-specific role do not permit a transaction. This is normal for completed tasks and non-assigned participants.</p></article>;
  }

  const canSend =
    simulation.isSuccess &&
    reviewedKey === intentKey &&
    submission === null &&
    !write.isPending;
  const actionError = errorMessage(simulation.error) ?? errorMessage(write.error) ?? errorMessage(receipt.error);

  return (
    <article className={styles.panel}>
      <span>Available transaction</span>
      <h2>{copy?.title}</h2>
      <p>{copy?.description}</p>
      {networkState !== "coston2" && <div className={styles.notice}>Switch the connected wallet to Coston2 below.</div>}
      {action === "approve" && !resultVerified && (
        <div className={styles.notice}>
          The committed result bytes must pass Keccak-256 verification before
          payment can be prepared. Retry the artifact request or inspect the
          result through a trusted gateway.
        </div>
      )}

      {action === "submit" && (
        <div className={styles.artifactForm}>
          <label><span>Version-pinned result URI</span><input maxLength={2_048} onChange={(event) => { setResultURI(event.target.value); setVerificationState("idle"); }} placeholder="ipfs://… or https://…/commit/result.json" value={resultURI} /></label>
          <label><span>Keccak-256 result hash</span><input maxLength={66} onChange={(event) => { setResultHashInput(event.target.value); setVerificationState("idle"); }} placeholder={`0x${"00".repeat(32)}`} value={resultHashInput} /></label>
          <button disabled={!resultHash || !resultURI.trim() || verificationState === "checking"} onClick={() => void verifyResult()} type="button">{verificationState === "checking" ? "Verifying…" : "Verify result bytes"}</button>
          {verificationMessage && <small className={verificationState === "verified" ? styles.good : styles.bad}>{verificationMessage}</small>}
        </div>
      )}

      <div className={styles.prepare}>
        <button disabled={!baseReady || !submitArtifactReady || (simulationRequested && simulation.isPending)} onClick={requestSimulation} type="button">{simulationRequested && simulation.isPending ? "Simulating…" : "Simulate transaction"}</button>
        <strong>{simulation.isSuccess ? "Public-RPC simulation passed" : "Simulation required"}</strong>
      </div>

      {simulation.isSuccess && (
        <label className={styles.review}><input checked={reviewedKey === intentKey} onChange={(event) => setReviewedKey(event.target.checked ? intentKey : null)} type="checkbox" /><span>I reviewed the connected account, Coston2 network, contract function, task ID, and this action&apos;s state or token effect.</span></label>
      )}
      <button className={styles.walletButton} disabled={!canSend} onClick={sendTransaction} type="button">{write.isPending ? "Waiting for wallet…" : copy?.button}</button>

      {submission && <div className={styles.receipt}><a href={`${coston2.blockExplorers.default.url}/tx/${submission.hash}`} rel="noreferrer" target="_blank">View transaction ↗</a><strong>{receipt.isPending && "Waiting for Coston2 receipt…"}{receipt.isSuccess && eventConfirmed && "Receipt and exact lifecycle event verified"}{receipt.isSuccess && !eventConfirmed && "Receipt succeeded; exact expected event not found"}</strong></div>}
      {actionError && <div className={styles.error} role="alert">{actionError}</div>}
    </article>
  );
}
