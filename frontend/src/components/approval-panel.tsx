"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  exactApprovalAmount,
  getApprovalIntentKey,
  getApprovalReadiness,
  getApprovalReadinessMessage,
} from "@/lib/approval-flow";
import {
  erc20ApprovalEventAbi,
  erc20ApproveAbi,
  erc20ReadAbi,
} from "@/lib/abi/erc20";
import {
  getWalletNetworkState,
  getWalletRole,
} from "@/lib/wallet-identity";

import styles from "./approval-panel.module.css";

interface ApprovalSubmission {
  account: Address;
  hash: Hex;
}

function getShortErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("name" in error && error.name === "UserRejectedRequestError") {
    return "The MetaMask request was rejected. No approval was broadcast and no gas was spent.";
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
  return "The wallet action did not complete.";
}

function formatToken(value: bigint | undefined): string {
  if (value === undefined) return "Reading...";
  return `${formatUnits(value, rewardTokenDecimals)} ${rewardTokenSymbol}`;
}

export function ApprovalPanel() {
  const connection = useConnection();
  const connectedAddress = connection.address ?? zeroAddress;
  const role = getWalletRole(connection.address);
  const networkState = getWalletNetworkState(connection.chainId);
  const [simulationIntentKey, setSimulationIntentKey] = useState<string | null>(
    null,
  );
  const [reviewedIntentKey, setReviewedIntentKey] = useState<string | null>(
    null,
  );
  const [submission, setSubmission] = useState<ApprovalSubmission | null>(null);

  const balance = useReadContract({
    abi: erc20ReadAbi,
    address: rewardTokenAddress,
    args: [connectedAddress],
    chainId: coston2.id,
    functionName: "balanceOf",
    query: { enabled: connection.isConnected },
  });
  const { refetch: refetchBalance } = balance;
  const allowance = useReadContract({
    abi: erc20ReadAbi,
    address: rewardTokenAddress,
    args: [connectedAddress, activeDeployment.address],
    chainId: coston2.id,
    functionName: "allowance",
    query: { enabled: connection.isConnected },
  });
  const { refetch: refetchAllowance } = allowance;

  const readiness = getApprovalReadiness({
    allowance: allowance.data,
    balance: balance.data,
    hasReadError: allowance.isError || balance.isError,
    isConnected: connection.isConnected,
    networkState,
    role,
  });
  const currentIntentKey = getApprovalIntentKey(
    connectedAddress,
    connection.chainId,
    allowance.data,
  );
  const simulationRequested =
    readiness === "ready" && simulationIntentKey === currentIntentKey;

  const simulation = useSimulateContract({
    abi: erc20ApproveAbi,
    account: connectedAddress,
    address: rewardTokenAddress,
    args: [activeDeployment.address, exactApprovalAmount],
    chainId: coston2.id,
    functionName: "approve",
    query: { enabled: simulationRequested },
  });
  const simulationPassed =
    simulation.isSuccess && simulation.data.result === true;
  const approvalCalldata = encodeFunctionData({
    abi: erc20ApproveAbi,
    args: [activeDeployment.address, exactApprovalAmount],
    functionName: "approve",
  });
  const gasEstimate = useEstimateGas({
    account: connectedAddress,
    chainId: coston2.id,
    data: approvalCalldata,
    to: rewardTokenAddress,
    query: { enabled: simulationRequested && simulationPassed },
  });
  const writeApproval = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    chainId: coston2.id,
    hash: submission?.hash,
    query: { enabled: submission !== null },
  });

  useEffect(() => {
    if (receipt.isSuccess && submission?.account === connection.address) {
      void refetchAllowance();
    }
  }, [connection.address, receipt.isSuccess, refetchAllowance, submission?.account]);

  const approvalEventConfirmed = useMemo(() => {
    if (!receipt.data || !submission) return false;

    return receipt.data.logs.some((log) => {
      if (log.address.toLowerCase() !== rewardTokenAddress.toLowerCase()) {
        return false;
      }
      try {
        const decoded = decodeEventLog({
          abi: erc20ApprovalEventAbi,
          data: log.data,
          topics: log.topics,
        });
        return (
          decoded.eventName === "Approval" &&
          decoded.args.owner.toLowerCase() === submission.account.toLowerCase() &&
          decoded.args.spender.toLowerCase() ===
            activeDeployment.address.toLowerCase() &&
          decoded.args.value === exactApprovalAmount
        );
      } catch {
        return false;
      }
    });
  }, [receipt.data, submission]);

  const reviewed = reviewedIntentKey === currentIntentKey;
  const canOpenWallet =
    readiness === "ready" &&
    simulationPassed &&
    gasEstimate.isSuccess &&
    reviewed &&
    !writeApproval.isPending &&
    !receipt.isPending &&
    submission === null;
  const actionError =
    getShortErrorMessage(balance.error) ??
    getShortErrorMessage(allowance.error) ??
    getShortErrorMessage(simulation.error) ??
    getShortErrorMessage(gasEstimate.error) ??
    getShortErrorMessage(writeApproval.error) ??
    getShortErrorMessage(receipt.error);

  function requestSimulation() {
    writeApproval.reset();
    setReviewedIntentKey(null);
    setSubmission(null);
    if (simulationIntentKey === currentIntentKey) {
      void simulation.refetch();
      return;
    }
    setSimulationIntentKey(currentIntentKey);
  }

  function requestWalletApproval() {
    if (!canOpenWallet || !simulation.data?.request || !connection.address) {
      return;
    }

    writeApproval.mutate(simulation.data.request, {
      onSuccess(hash) {
        setSubmission({ account: connection.address as Address, hash });
      },
    });
  }

  return (
    <section className={styles.approvalSection} id="approval-preflight">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.eyebrow}>Write milestone 01</p>
          <h2>Prepare exactly 1 FTestXRP for the next task escrow.</h2>
        </div>
        <p>
          This is ERC-20 <code>approve</code>, not TaskBounty {" "}
          <code>approveTask</code>. It sets a limited allowance; it does not move
          tokens or create Task #2.
        </p>
      </div>

      <div className={styles.approvalCard}>
        <div className={styles.cardHeading}>
          <div>
            <span>Simulation-gated transaction</span>
            <h3>FTestXRP allowance preflight</h3>
          </div>
          <strong
            className={`${styles.statusPill} ${
              readiness === "ready" || readiness === "allowance-satisfied"
                ? styles.statusReady
                : ""
            }`}
          >
            {readiness === "allowance-satisfied" ? "Confirmed" : readiness}
          </strong>
        </div>

        <p className={styles.readinessMessage} aria-live="polite">
          {getApprovalReadinessMessage(readiness)}
        </p>
        {readiness === "chain-read-error" && (
          <button
            className={styles.retryButton}
            disabled={balance.isFetching || allowance.isFetching}
            onClick={() => {
              void Promise.all([refetchBalance(), refetchAllowance()]);
            }}
            type="button"
          >
            {balance.isFetching || allowance.isFetching
              ? "Retrying reads..."
              : "Retry public reads"}
          </button>
        )}

        <div className={styles.guardGrid} aria-label="Approval guards">
          <article>
            <span>Account</span>
            <strong>{role === "task-1-creator" ? "Creator matched" : "Creator required"}</strong>
          </article>
          <article>
            <span>Network</span>
            <strong>{networkState === "coston2" ? "Coston2 / 114" : "Coston2 required"}</strong>
          </article>
          <article>
            <span>Balance</span>
            <strong>{formatToken(balance.data)}</strong>
          </article>
          <article>
            <span>Current allowance</span>
            <strong>{formatToken(allowance.data)}</strong>
          </article>
        </div>

        <div className={styles.transactionReview}>
          <div className={styles.reviewHeading}>
            <div>
              <span>Exact transaction intent</span>
              <h3>Review before MetaMask opens</h3>
            </div>
            <span className={styles.noValuePill}>Token transfer now: 0</span>
          </div>

          <dl>
            <div>
              <dt>Network</dt>
              <dd>Coston2 / chainId 114</dd>
            </div>
            <div>
              <dt>Target token contract</dt>
              <dd><code>{rewardTokenAddress}</code></dd>
            </div>
            <div>
              <dt>Function</dt>
              <dd><code>approve(address,uint256)</code></dd>
            </div>
            <div>
              <dt>Spender</dt>
              <dd><code>{activeDeployment.address}</code></dd>
            </div>
            <div>
              <dt>New exact allowance</dt>
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
          </dl>
        </div>

        <div className={styles.simulationArea}>
          <div>
            <span>Public RPC preflight</span>
            <strong>
              {!simulationRequested && "Not run"}
              {simulationRequested && simulation.isPending && "Simulating..."}
              {simulationRequested && simulationPassed &&
                "Simulation passed / approve returned true"}
              {simulationRequested && simulation.isSuccess &&
                !simulationPassed && "Simulation returned false"}
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
              : "Simulate exact approval"}
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
              I verified chain 114, the FTestXRP contract, the TaskBounty V2
              spender, and the exact 1 FTestXRP allowance.
            </span>
          </label>
        )}

        <div className={styles.writeArea}>
          <button
            disabled={!canOpenWallet}
            onClick={requestWalletApproval}
            type="button"
          >
            {writeApproval.isPending
              ? "Waiting for MetaMask..."
              : "Open MetaMask confirmation"}
          </button>
          <p>
            MetaMask performs the signature. Rejecting the request creates no
            transaction and spends no gas.
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
              {receipt.isSuccess && approvalEventConfirmed &&
                "Receipt succeeded / Approval event verified"}
              {receipt.isSuccess && !approvalEventConfirmed &&
                "Receipt succeeded, but the expected Approval event was not found"}
            </strong>
          </div>
        )}

        {actionError && (
          <div className={styles.errorBanner} role="alert">
            <strong>Approval flow stopped safely.</strong>
            <span>{actionError}</span>
          </div>
        )}
      </div>

      <div className={styles.educationGrid}>
        <article>
          <span>01</span>
          <strong>Allowance is not a transfer</strong>
          <p>Creator stays at 8 FTestXRP until a later createTask pulls escrow.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Exact amount, never unlimited</strong>
          <p>The requested allowance is fixed at 1 FTestXRP, not uint256.max.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Receipt plus public read</strong>
          <p>Success requires the receipt, Approval event, and refreshed allowance.</p>
        </article>
      </div>
    </section>
  );
}
