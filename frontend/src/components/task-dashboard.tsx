"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUnits, type Hex } from "viem";

import {
  activeDeployment,
  deployments,
} from "@/config/deployments";
import {
  fetchAndVerifyArtifact,
  type ArtifactVerification,
} from "@/lib/artifact-verification";
import {
  readDashboardData,
  type DashboardData,
} from "@/lib/read-dashboard";
import { getTaskStatusLabel } from "@/lib/task-status";

import styles from "./task-dashboard.module.css";

type CheckState =
  | { status: "loading" }
  | { message: string; status: "error" }
  | { result: ArtifactVerification; status: "ready" };

interface ArtifactCardProps {
  check: CheckState;
  hash: Hex;
  label: string;
  uri: string;
}

const initialChecks: Record<"metadata" | "result", CheckState> = {
  metadata: { status: "loading" },
  result: { status: "loading" },
};

function shorten(value: string, start = 8, end = 6): string {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown request error";
}

function explorerAddressUrl(address: string): string {
  return `https://coston2-explorer.flare.network/address/${address}`;
}

function formatToken(value: bigint, decimals: number, symbol: string): string {
  return `${formatUnits(value, decimals)} ${symbol}`;
}

function ArtifactCard({ check, hash, label, uri }: ArtifactCardProps) {
  const ready = check.status === "ready";
  const matches = ready && check.result.matches;

  return (
    <article className={styles.artifactCard}>
      <div className={styles.cardHeading}>
        <div>
          <span className={styles.cardLabel}>{label}</span>
          <h3>{label === "Task manifest" ? "Creator brief" : "Worker result"}</h3>
        </div>
        <span
          className={`${styles.verificationPill} ${
            matches
              ? styles.verified
              : check.status === "error"
                ? styles.failed
                : ""
          }`}
          aria-live="polite"
        >
          {check.status === "loading" && "Checking bytes"}
          {check.status === "error" && "Unavailable"}
          {ready && (matches ? "Hash verified" : "Hash mismatch")}
        </span>
      </div>

      <dl className={styles.artifactDetails}>
        <div>
          <dt>On-chain commitment</dt>
          <dd title={hash}>{shorten(hash, 12, 10)}</dd>
        </div>
        <div>
          <dt>Retrieved bytes</dt>
          <dd>
            {ready ? check.result.byteLength.toLocaleString() : "Pending"}
          </dd>
        </div>
        <div>
          <dt>Computed hash</dt>
          <dd title={ready ? check.result.actualHash : undefined}>
            {ready ? shorten(check.result.actualHash, 12, 10) : "Pending"}
          </dd>
        </div>
      </dl>

      {check.status === "error" && (
        <p className={styles.artifactError}>{check.message}</p>
      )}

      <a className={styles.textLink} href={uri} target="_blank" rel="noreferrer">
        Open version-pinned artifact <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}

export function TaskDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [checks, setChecks] =
    useState<Record<"metadata" | "result", CheckState>>(initialChecks);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const nextData = await readDashboardData();
      setData(nextData);

      const [metadata, result] = await Promise.allSettled([
        fetchAndVerifyArtifact(
          nextData.task.metadataURI,
          nextData.task.metadataHash,
        ),
        fetchAndVerifyArtifact(
          nextData.task.resultURI,
          nextData.task.resultHash,
        ),
      ]);

      setChecks({
        metadata:
          metadata.status === "fulfilled"
            ? { result: metadata.value, status: "ready" }
            : { message: toErrorMessage(metadata.reason), status: "error" },
        result:
          result.status === "fulfilled"
            ? { result: result.value, status: "ready" }
            : { message: toErrorMessage(result.reason), status: "error" },
      });
      setUpdatedAt(new Date());
    } catch (requestError) {
      setError(toErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setChecks(initialChecks);
    void load();
  }, [load]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const statusLabel = data ? getTaskStatusLabel(data.task.status) : "Loading";

  return (
    <section className={styles.dashboard} id="live-dashboard">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Live public RPC</p>
          <h2>V2 Task #1 verification</h2>
          <p>
            Values below are read from the configured Coston2 deployment at
            the latest block. Refreshing never requests a wallet signature.
          </p>
        </div>
        <button type="button" onClick={refresh} disabled={loading}>
          {loading ? "Reading chain…" : "Refresh data"}
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <strong>Public read failed.</strong>
          <span>{error}</span>
        </div>
      )}

      <div className={styles.summaryGrid} aria-busy={loading && !data}>
        <article>
          <span>Status</span>
          <strong className={styles.statusValue}>{statusLabel}</strong>
          <small>enum value {data?.task.status ?? "—"}</small>
        </article>
        <article>
          <span>Escrow liability</span>
          <strong>
            {data
              ? formatToken(
                  data.totalEscrowed,
                  data.tokenDecimals,
                  data.tokenSymbol,
                )
              : "—"}
          </strong>
          <small>totalEscrowed()</small>
        </article>
        <article>
          <span>Contract version</span>
          <strong>{data?.version ?? "—"}</strong>
          <small>{activeDeployment.abiVersion.toUpperCase()} ABI selected</small>
        </article>
        <article>
          <span>Latest observed block</span>
          <strong>{data?.blockNumber.toLocaleString() ?? "—"}</strong>
          <small>{updatedAt ? updatedAt.toLocaleTimeString() : "Waiting"}</small>
        </article>
      </div>

      {data && (
        <>
          <div className={styles.taskGrid}>
            <article className={styles.taskCard}>
              <div className={styles.cardHeading}>
                <div>
                  <span className={styles.cardLabel}>On-chain task</span>
                  <h3>Escrow participants</h3>
                </div>
                <span className={styles.completedPill}>{statusLabel}</span>
              </div>

              <dl className={styles.taskDetails}>
                <div>
                  <dt>Creator</dt>
                  <dd>
                    <a
                      href={explorerAddressUrl(data.task.creator)}
                      target="_blank"
                      rel="noreferrer"
                      title={data.task.creator}
                    >
                      {shorten(data.task.creator)} ↗
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Worker</dt>
                  <dd>
                    <a
                      href={explorerAddressUrl(data.task.worker)}
                      target="_blank"
                      rel="noreferrer"
                      title={data.task.worker}
                    >
                      {shorten(data.task.worker)} ↗
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Reward</dt>
                  <dd>
                    {formatToken(
                      data.task.reward,
                      data.tokenDecimals,
                      data.tokenSymbol,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Next task ID</dt>
                  <dd>{data.nextTaskId.toString()}</dd>
                </div>
              </dl>
            </article>

            <article className={styles.taskCard}>
              <div className={styles.cardHeading}>
                <div>
                  <span className={styles.cardLabel}>Deployment guard</span>
                  <h3>Address and ABI mapping</h3>
                </div>
                <span
                  className={`${styles.verificationPill} ${
                    data.rewardTokenMatchesConfig
                      ? styles.verified
                      : styles.failed
                  }`}
                >
                  {data.rewardTokenMatchesConfig
                    ? "Token matched"
                    : "Token mismatch"}
                </span>
              </div>

              <dl className={styles.taskDetails}>
                <div>
                  <dt>Current deployment</dt>
                  <dd title={activeDeployment.address}>
                    {shorten(activeDeployment.address)}
                  </dd>
                </div>
                <div>
                  <dt>Historical deployment</dt>
                  <dd title={deployments.historicalV1.address}>
                    {shorten(deployments.historicalV1.address)}
                  </dd>
                </div>
                <div>
                  <dt>Chain ID</dt>
                  <dd>{data.chainId}</dd>
                </div>
                <div>
                  <dt>Reward token</dt>
                  <dd title={data.rewardToken}>{shorten(data.rewardToken)}</dd>
                </div>
              </dl>
            </article>
          </div>

          <div className={styles.balanceGrid}>
            <article>
              <span>Creator balance</span>
              <strong>
                {formatToken(
                  data.balances.creator,
                  data.tokenDecimals,
                  data.tokenSymbol,
                )}
              </strong>
            </article>
            <article>
              <span>V2 contract balance</span>
              <strong>
                {formatToken(
                  data.balances.contract,
                  data.tokenDecimals,
                  data.tokenSymbol,
                )}
              </strong>
            </article>
            <article>
              <span>Worker balance</span>
              <strong>
                {formatToken(
                  data.balances.worker,
                  data.tokenDecimals,
                  data.tokenSymbol,
                )}
              </strong>
            </article>
          </div>

          <div className={styles.artifactGrid}>
            <ArtifactCard
              check={checks.metadata}
              hash={data.task.metadataHash}
              label="Task manifest"
              uri={data.task.metadataURI}
            />
            <ArtifactCard
              check={checks.result}
              hash={data.task.resultHash}
              label="Result manifest"
              uri={data.task.resultURI}
            />
          </div>
        </>
      )}
    </section>
  );
}
