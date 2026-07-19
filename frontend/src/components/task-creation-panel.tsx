"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  decodeEventLog,
  encodeFunctionData,
  formatUnits,
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
import { task2Manifest } from "@/config/task-2";
import { erc20ReadAbi } from "@/lib/abi/erc20";
import { taskBountyV2Abi } from "@/lib/abi/task-bounty-v2";
import { fetchAndVerifyArtifact } from "@/lib/artifact-verification";
import {
  canOpenTaskCreationWallet,
  getTaskCreationIntentKey,
  getTaskCreationReadiness,
  getTaskCreationReadinessMessage,
  type ManifestVerificationState,
} from "@/lib/task-creation-flow";
import {
  getWalletNetworkState,
  getWalletRole,
} from "@/lib/wallet-identity";

import styles from "./task-creation-panel.module.css";

interface TaskCreationSubmission {
  account: Address;
  hash: Hex;
}

interface ManifestCheck {
  byteLength?: number;
  message?: string;
  state: ManifestVerificationState;
}

function getShortErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("name" in error && error.name === "UserRejectedRequestError") {
    return "The MetaMask request was rejected. No task was created, no tokens moved, and no gas was spent.";
  }
  if (
    "shortMessage" in error &&
    typeof error.shortMessage === "string" &&
    error.shortMessage.length > 0
  ) {
    return error.shortMessage;
  }
  if (
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message;
  }
  return "The task-creation action did not complete.";
}

function formatToken(value: bigint | undefined): string {
  if (value === undefined) return "Reading...";
  return `${formatUnits(value, rewardTokenDecimals)} ${rewardTokenSymbol}`;
}

function shorten(value: string, start = 12, end = 10): string {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

export function TaskCreationPanel() {
  const connection = useConnection();
  const connectedAddress = connection.address ?? zeroAddress;
  const role = getWalletRole(connection.address);
  const networkState = getWalletNetworkState(connection.chainId);
  const [manifestCheck, setManifestCheck] = useState<ManifestCheck>({
    state: "checking",
  });
  const [simulationIntentKey, setSimulationIntentKey] = useState<string | null>(
    null,
  );
  const [reviewedIntentKey, setReviewedIntentKey] = useState<string | null>(
    null,
  );
  const [submission, setSubmission] =
    useState<TaskCreationSubmission | null>(null);

  const verifyManifest = useCallback(async () => {
    setManifestCheck({ state: "checking" });
    try {
      const result = await fetchAndVerifyArtifact(
        task2Manifest.uri,
        task2Manifest.hash,
      );
      setManifestCheck(
        result.matches
          ? { byteLength: result.byteLength, state: "verified" }
          : {
              byteLength: result.byteLength,
              message: `Computed ${result.actualHash}`,
              state: "mismatch",
            },
      );
    } catch (error) {
      setManifestCheck({
        message: getShortErrorMessage(error) ?? "Manifest request failed.",
        state: "unavailable",
      });
    }
  }, []);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void verifyManifest(), 0);
    return () => window.clearTimeout(initialCheck);
  }, [verifyManifest]);

  const creatorBalance = useReadContract({
    abi: erc20ReadAbi,
    address: rewardTokenAddress,
    args: [connectedAddress],
    chainId: coston2.id,
    functionName: "balanceOf",
    query: { enabled: connection.isConnected },
  });
  const contractBalance = useReadContract({
    abi: erc20ReadAbi,
    address: rewardTokenAddress,
    args: [activeDeployment.address],
    chainId: coston2.id,
    functionName: "balanceOf",
    query: { enabled: connection.isConnected },
  });
  const allowance = useReadContract({
    abi: erc20ReadAbi,
    address: rewardTokenAddress,
    args: [connectedAddress, activeDeployment.address],
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
  const { refetch: refetchCreatorBalance } = creatorBalance;
  const { refetch: refetchContractBalance } = contractBalance;
  const { refetch: refetchAllowance } = allowance;
  const { refetch: refetchNextTaskId } = nextTaskId;
  const { refetch: refetchTotalEscrowed } = totalEscrowed;

  const readiness = getTaskCreationReadiness({
    allowance: allowance.data,
    balance: creatorBalance.data,
    expectedTaskId: task2Manifest.expectedTaskId,
    hasReadError:
      allowance.isError ||
      creatorBalance.isError ||
      contractBalance.isError ||
      nextTaskId.isError ||
      totalEscrowed.isError,
    isConnected: connection.isConnected,
    manifestState: manifestCheck.state,
    networkState,
    nextTaskId: nextTaskId.data,
    reward: task2Manifest.reward,
    role,
    totalEscrowed: totalEscrowed.data,
  });
  const currentIntentKey = getTaskCreationIntentKey(
    connectedAddress,
    connection.chainId,
    allowance.data,
    creatorBalance.data,
    nextTaskId.data,
    totalEscrowed.data,
    task2Manifest.hash,
  );
  const simulationRequested =
    readiness === "ready" && simulationIntentKey === currentIntentKey;

  const simulation = useSimulateContract({
    abi: taskBountyV2Abi,
    account: connectedAddress,
    address: activeDeployment.address,
    args: [task2Manifest.reward, task2Manifest.uri, task2Manifest.hash],
    chainId: coston2.id,
    functionName: "createTask",
    query: { enabled: simulationRequested },
  });
  const simulationPassed =
    simulation.isSuccess &&
    simulation.data.result === task2Manifest.expectedTaskId;
  const createTaskCalldata = encodeFunctionData({
    abi: taskBountyV2Abi,
    args: [task2Manifest.reward, task2Manifest.uri, task2Manifest.hash],
    functionName: "createTask",
  });
  const gasEstimate = useEstimateGas({
    account: connectedAddress,
    chainId: coston2.id,
    data: createTaskCalldata,
    to: activeDeployment.address,
    query: { enabled: simulationRequested && simulationPassed },
  });
  const writeCreateTask = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    chainId: coston2.id,
    hash: submission?.hash,
    query: { enabled: submission !== null },
  });

  const refreshState = useCallback(() => {
    void Promise.all([
      refetchCreatorBalance(),
      refetchContractBalance(),
      refetchAllowance(),
      refetchNextTaskId(),
      refetchTotalEscrowed(),
    ]);
  }, [
    refetchAllowance,
    refetchContractBalance,
    refetchCreatorBalance,
    refetchNextTaskId,
    refetchTotalEscrowed,
  ]);

  useEffect(() => {
    if (receipt.isSuccess && submission?.account === connection.address) {
      refreshState();
    }
  }, [connection.address, receipt.isSuccess, refreshState, submission?.account]);

  const taskCreatedEventConfirmed = useMemo(() => {
    if (!receipt.data || !submission) return false;

    return receipt.data.logs.some((log) => {
      if (log.address.toLowerCase() !== activeDeployment.address.toLowerCase()) {
        return false;
      }
      try {
        const decoded = decodeEventLog({
          abi: taskBountyV2Abi,
          data: log.data,
          topics: log.topics,
        });
        return (
          decoded.eventName === "TaskCreated" &&
          decoded.args.taskId === task2Manifest.expectedTaskId &&
          decoded.args.creator.toLowerCase() ===
            submission.account.toLowerCase() &&
          decoded.args.metadataHash === task2Manifest.hash &&
          decoded.args.reward === task2Manifest.reward &&
          decoded.args.metadataURI === task2Manifest.uri
        );
      } catch {
        return false;
      }
    });
  }, [receipt.data, submission]);

  const reviewed = reviewedIntentKey === currentIntentKey;
  const canOpenWallet = canOpenTaskCreationWallet({
    gasEstimateSucceeded: gasEstimate.isSuccess,
    hasSubmission: submission !== null,
    readiness,
    reviewed,
    simulationPassed,
    writePending: writeCreateTask.isPending,
  });
  const actionError =
    getShortErrorMessage(creatorBalance.error) ??
    getShortErrorMessage(contractBalance.error) ??
    getShortErrorMessage(allowance.error) ??
    getShortErrorMessage(nextTaskId.error) ??
    getShortErrorMessage(totalEscrowed.error) ??
    getShortErrorMessage(simulation.error) ??
    getShortErrorMessage(gasEstimate.error) ??
    getShortErrorMessage(writeCreateTask.error) ??
    getShortErrorMessage(receipt.error);

  function requestSimulation() {
    writeCreateTask.reset();
    setReviewedIntentKey(null);
    setSubmission(null);
    if (simulationIntentKey === currentIntentKey) {
      void simulation.refetch();
      return;
    }
    setSimulationIntentKey(currentIntentKey);
  }

  function requestWalletCreation() {
    if (!canOpenWallet || !simulation.data?.request || !connection.address) {
      return;
    }

    writeCreateTask.mutate(simulation.data.request, {
      onSuccess(hash) {
        setSubmission({ account: connection.address as Address, hash });
      },
    });
  }

  const readsFetching =
    creatorBalance.isFetching ||
    contractBalance.isFetching ||
    allowance.isFetching ||
    nextTaskId.isFetching ||
    totalEscrowed.isFetching;

  return (
    <section className={styles.creationSection} id="create-task-preflight">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.eyebrow}>Write milestone 02</p>
          <h2>Create Task #2 and move the exact reward into escrow.</h2>
        </div>
        <p>
          This calls TaskBounty V2 <code>createTask</code>. Unlike approval, a
          successful transaction uses <code>transferFrom</code> to move 1
          FTestXRP from Creator into the contract and increase the escrow
          liability.
        </p>
      </div>

      <div className={styles.creationCard}>
        <div className={styles.cardHeading}>
          <div>
            <span>Simulation-gated escrow deposit</span>
            <h3>Task #2 creation preflight</h3>
          </div>
          <strong
            className={`${styles.statusPill} ${
              readiness === "ready" || readiness === "task-created"
                ? styles.statusReady
                : ""
            }`}
          >
            {readiness}
          </strong>
        </div>

        <p className={styles.readinessMessage} aria-live="polite">
          {getTaskCreationReadinessMessage(readiness)}
        </p>

        <div className={styles.guardGrid} aria-label="Task creation guards">
          <article>
            <span>Creator balance</span>
            <strong>{formatToken(creatorBalance.data)}</strong>
          </article>
          <article>
            <span>Exact allowance</span>
            <strong>{formatToken(allowance.data)}</strong>
          </article>
          <article>
            <span>Next task ID</span>
            <strong>{nextTaskId.data?.toString() ?? "Reading..."}</strong>
          </article>
          <article>
            <span>Current escrow liability</span>
            <strong>{formatToken(totalEscrowed.data)}</strong>
          </article>
        </div>

        <div className={styles.manifestArea}>
          <div>
            <span>Version-pinned task manifest</span>
            <strong>
              {manifestCheck.state === "checking" && "Checking exact bytes..."}
              {manifestCheck.state === "verified" &&
                `Hash verified / ${manifestCheck.byteLength?.toLocaleString()} bytes`}
              {manifestCheck.state === "mismatch" && "Hash mismatch"}
              {manifestCheck.state === "unavailable" && "Manifest unavailable"}
            </strong>
            {manifestCheck.message && <small>{manifestCheck.message}</small>}
          </div>
          <button
            disabled={manifestCheck.state === "checking"}
            onClick={() => void verifyManifest()}
            type="button"
          >
            Recheck manifest
          </button>
        </div>

        <div className={styles.transactionReview}>
          <div className={styles.reviewHeading}>
            <div>
              <span>Exact transaction intent</span>
              <h3>Review before MetaMask opens</h3>
            </div>
            <span className={styles.valuePill}>Escrow deposit: 1 FTestXRP</span>
          </div>

          <dl>
            <div>
              <dt>Network</dt>
              <dd>Coston2 / chainId 114</dd>
            </div>
            <div>
              <dt>Target contract</dt>
              <dd><code>{activeDeployment.address}</code></dd>
            </div>
            <div>
              <dt>Function</dt>
              <dd><code>createTask(uint256,string,bytes32)</code></dd>
            </div>
            <div>
              <dt>Expected task ID</dt>
              <dd>#{task2Manifest.expectedTaskId.toString()}</dd>
            </div>
            <div>
              <dt>Reward</dt>
              <dd>1 FTestXRP / 1,000,000 units</dd>
            </div>
            <div>
              <dt>Estimated gas limit</dt>
              <dd>
                {gasEstimate.isPending && simulationRequested
                  ? "Estimating..."
                  : gasEstimate.data?.toLocaleString() ?? "Run simulation first"}
              </dd>
            </div>
            <div>
              <dt>Metadata hash</dt>
              <dd title={task2Manifest.hash}><code>{shorten(task2Manifest.hash)}</code></dd>
            </div>
            <div>
              <dt>Metadata URI</dt>
              <dd>
                <a href={task2Manifest.uri} target="_blank" rel="noreferrer">
                  Open pinned JSON ↗
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <div className={styles.simulationArea}>
          <div>
            <span>Public RPC preflight</span>
            <strong>
              {!simulationRequested && "Not run"}
              {simulationRequested && simulation.isPending && "Simulating..."}
              {simulationRequested && simulationPassed &&
                "Simulation passed / predicted taskId 2"}
              {simulationRequested && simulation.isSuccess &&
                !simulationPassed && "Simulation returned an unexpected task ID"}
              {simulationRequested && simulation.isError && "Simulation failed"}
            </strong>
          </div>
          <button
            disabled={
              readiness !== "ready" ||
              (simulationRequested && simulation.isPending)
            }
            onClick={requestSimulation}
            type="button"
          >
            {simulationRequested && simulation.isPending
              ? "Simulating..."
              : "Simulate Task #2 creation"}
          </button>
        </div>

        {simulationPassed && gasEstimate.isSuccess && readiness === "ready" && (
          <label className={styles.reviewCheck}>
            <input
              checked={reviewed}
              onChange={(event) =>
                setReviewedIntentKey(event.target.checked ? currentIntentKey : null)
              }
              type="checkbox"
            />
            <span>
              I verified chain 114, TaskBounty V2, Task #2, the pinned metadata
              hash, and the exact 1 FTestXRP escrow deposit.
            </span>
          </label>
        )}

        <div className={styles.writeArea}>
          <button
            disabled={!canOpenWallet}
            onClick={requestWalletCreation}
            type="button"
          >
            {writeCreateTask.isPending
              ? "Waiting for MetaMask..."
              : "Open MetaMask to create Task #2"}
          </button>
          <p>
            Only MetaMask can sign. A successful transaction transfers 1
            FTestXRP into V2 escrow; rejection broadcasts nothing and spends no
            gas.
          </p>
        </div>

        {submission && (
          <div className={styles.receiptArea} aria-live="polite">
            <span>Submitted transaction</span>
            <a
              href={`${coston2.blockExplorers.default.url}/tx/${submission.hash}`}
              rel="noreferrer"
              target="_blank"
            >
              {submission.hash} -&gt;
            </a>
            <strong>
              {receipt.isPending && "Waiting for Coston2 receipt..."}
              {receipt.isSuccess && taskCreatedEventConfirmed &&
                "Receipt succeeded / TaskCreated event verified"}
              {receipt.isSuccess && !taskCreatedEventConfirmed &&
                "Receipt succeeded, but the exact TaskCreated event was not found"}
            </strong>
          </div>
        )}

        {actionError && (
          <div className={styles.errorBanner} role="alert">
            <strong>Task creation stopped safely.</strong>
            <span>{actionError}</span>
          </div>
        )}

        <div className={styles.postState}>
          <span>Live post-transaction indicators</span>
          <dl>
            <div>
              <dt>Creator</dt>
              <dd>{formatToken(creatorBalance.data)}</dd>
            </div>
            <div>
              <dt>V2 balance</dt>
              <dd>{formatToken(contractBalance.data)}</dd>
            </div>
            <div>
              <dt>Allowance</dt>
              <dd>{formatToken(allowance.data)}</dd>
            </div>
            <div>
              <dt>Total escrowed</dt>
              <dd>{formatToken(totalEscrowed.data)}</dd>
            </div>
          </dl>
          <button disabled={readsFetching} onClick={refreshState} type="button">
            {readsFetching ? "Refreshing..." : "Refresh public state"}
          </button>
        </div>
      </div>

      <div className={styles.educationGrid}>
        <article>
          <span>01</span>
          <strong>Simulation returns taskId</strong>
          <p>The eth_call must predict Task #2 before the wallet is allowed to open.</p>
        </article>
        <article>
          <span>02</span>
          <strong>transferFrom consumes allowance</strong>
          <p>The exact allowance should return to zero when 1 FTestXRP enters escrow.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Hash binds the task brief</strong>
          <p>The contract stores both a retrieval URI and the exact-byte Keccak-256 commitment.</p>
        </article>
      </div>
    </section>
  );
}
