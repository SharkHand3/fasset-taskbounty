"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";

import {
  rewardTokenDecimals,
  rewardTokenSymbol,
} from "@/config/deployments";
import {
  fetchAndVerifyJsonArtifact,
  type ArtifactVerification,
} from "@/lib/artifact-verification";
import {
  readRecentTasks,
  type ChainTask,
  type ProtocolOverview,
} from "@/lib/task-reader";
import {
  parseTaskManifest,
  type TaskManifestView,
} from "@/lib/task-manifest";
import { getTaskStatusLabel } from "@/lib/task-status";
import { shortenAddress } from "@/lib/wallet-identity";

import styles from "./task-market.module.css";

type Filter = "active" | "all" | "completed" | "open";

interface MarketTask {
  artifactError?: string;
  artifactLoading?: boolean;
  manifest?: TaskManifestView;
  task: ChainTask;
  verification?: ArtifactVerification;
}

function isActive(status: number): boolean {
  return status === 0 || status === 1 || status === 2;
}

function matchesFilter(status: number, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return isActive(status);
  if (filter === "completed") return status === 3;
  return status === 0;
}

async function enrichTask(task: ChainTask): Promise<MarketTask> {
  try {
    const artifact = await fetchAndVerifyJsonArtifact(
      task.metadataURI,
      task.metadataHash,
      parseTaskManifest,
    );
    return {
      manifest: artifact.matches ? artifact.data : undefined,
      task,
      verification: artifact,
    };
  } catch (error) {
    return {
      artifactError:
        error instanceof Error ? error.message : "Task brief unavailable.",
      task,
    };
  }
}

export function TaskMarket() {
  const [filter, setFilter] = useState<Filter>("all");
  const [tasks, setTasks] = useState<MarketTask[]>([]);
  const [overview, setOverview] = useState<ProtocolOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setEnriching(false);
    try {
      const chainData = await readRecentTasks();
      if (requestId !== requestSequence.current) return;
      setOverview(chainData.overview);
      setTasks(
        chainData.tasks.map((task) => ({ artifactLoading: true, task })),
      );
      setError(null);
      setLoading(false);
      setEnriching(true);

      const enrichedTasks = await Promise.all(chainData.tasks.map(enrichTask));
      if (requestId !== requestSequence.current) return;
      setTasks(enrichedTasks);
    } catch (requestError) {
      if (requestId !== requestSequence.current) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to read the task market.",
      );
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setEnriching(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      requestSequence.current += 1;
    };
  }, [load]);

  const visibleTasks = useMemo(
    () => tasks.filter(({ task }) => matchesFilter(task.status, filter)),
    [filter, tasks],
  );
  const counts = useMemo(
    () => ({
      active: tasks.filter(({ task }) => isActive(task.status)).length,
      completed: tasks.filter(({ task }) => task.status === 3).length,
      open: tasks.filter(({ task }) => task.status === 0).length,
    }),
    [tasks],
  );

  return (
    <>
      <div className={styles.stats} aria-live="polite">
        <div>
          <span>Tasks created</span>
          <strong>{overview?.latestTaskId.toString() ?? "—"}</strong>
        </div>
        <div>
          <span>Open in view</span>
          <strong>{loading ? "—" : counts.open}</strong>
        </div>
        <div>
          <span>Active in view</span>
          <strong>{loading ? "—" : counts.active}</strong>
        </div>
        <div>
          <span>Escrow liability</span>
          <strong>
            {overview
              ? `${formatUnits(overview.totalEscrowed, rewardTokenDecimals)} ${rewardTokenSymbol}`
              : "—"}
          </strong>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label="Task filters">
          {(["all", "open", "active", "completed"] as const).map((value) => (
            <button
              aria-pressed={filter === value}
              className={filter === value ? styles.activeFilter : ""}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
        <button
          disabled={loading || enriching}
          onClick={() => void load()}
          type="button"
        >
          {loading
            ? "Syncing Coston2…"
            : enriching
              ? "Verifying briefs…"
              : "Refresh"}
        </button>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <strong>Marketplace read failed</strong>
          <span>{error}</span>
        </div>
      )}

      {!error && !loading && visibleTasks.length === 0 && (
        <div className={styles.empty}>
          <strong>No tasks match this filter.</strong>
          <p>Try another status or publish a new bounty.</p>
          <Link href="/tasks/new/">Post a bounty</Link>
        </div>
      )}

      <div className={styles.grid} aria-busy={loading || enriching}>
        {loading &&
          Array.from({ length: 3 }, (_, index) => (
            <article className={styles.skeleton} key={index} aria-hidden="true" />
          ))}

        {!loading &&
          visibleTasks.map(({ artifactError, artifactLoading, manifest, task, verification }) => {
            const status = getTaskStatusLabel(task.status);
            const verified = verification?.matches === true;

            return (
              <article className={styles.card} key={task.id.toString()}>
                <div className={styles.cardTopline}>
                  <span>Task #{task.id.toString()}</span>
                  <span className={`${styles.status} ${styles[`status${task.status}`]}`}>
                    {status}
                  </span>
                </div>
                <h2>
                  {artifactLoading
                    ? `Reading Task #${task.id.toString()} brief…`
                    : manifest?.title ?? `On-chain Task #${task.id.toString()}`}
                </h2>
                <p className={styles.description}>
                  {artifactLoading
                    ? "The on-chain task is available while its committed brief is verified."
                    : manifest?.description ??
                      "The committed brief is unavailable or failed integrity verification."}
                </p>

                <div className={styles.reward}>
                  <span>Reward</span>
                  <strong>
                    {formatUnits(task.reward, rewardTokenDecimals)} {rewardTokenSymbol}
                  </strong>
                </div>

                <dl>
                  <div>
                    <dt>Creator</dt>
                    <dd title={task.creator}>{shortenAddress(task.creator)}</dd>
                  </div>
                  <div>
                    <dt>Brief integrity</dt>
                    <dd className={verified ? styles.verified : styles.unverified}>
                      {artifactLoading
                        ? "Checking"
                        : verified
                          ? "Verified"
                          : artifactError
                            ? "Unavailable"
                            : "Mismatch"}
                    </dd>
                  </div>
                </dl>

                <Link href={`/tasks/view/?id=${task.id.toString()}`}>
                  View bounty <span aria-hidden="true">→</span>
                </Link>
              </article>
            );
          })}
      </div>

      {overview && overview.latestTaskId > 24n && (
        <p className={styles.indexerNote}>
          Showing the latest 24 tasks. Historical pagination will move to the
          event indexer as the marketplace grows.
        </p>
      )}
    </>
  );
}
