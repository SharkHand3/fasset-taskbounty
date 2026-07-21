"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatUnits, zeroHash } from "viem";
import { useConnection } from "wagmi";

import {
  rewardTokenDecimals,
  rewardTokenSymbol,
} from "@/config/deployments";
import {
  fetchAndVerifyArtifact,
  fetchAndVerifyJsonArtifact,
  type ArtifactVerification,
} from "@/lib/artifact-verification";
import { tryResolveArtifactURI } from "@/lib/artifact-uri";
import { readTask, type ChainTask } from "@/lib/task-reader";
import {
  parseTaskManifest,
  type TaskManifestView,
} from "@/lib/task-manifest";
import { getTaskRole, getTaskRoleLabel } from "@/lib/task-role";
import { getTaskStatusLabel } from "@/lib/task-status";
import { shortenAddress } from "@/lib/wallet-identity";
import { TaskActionPanel } from "./task-action-panel";

import styles from "./task-detail.module.css";

interface ArtifactState<T = never> {
  data?: T;
  error?: string;
  verification?: ArtifactVerification;
}

function parseTaskId(): bigint | null {
  const value = new URLSearchParams(window.location.search).get("id");
  if (!value || !/^\d+$/.test(value)) return null;
  const taskId = BigInt(value);
  return taskId > 0n ? taskId : null;
}

export function TaskDetail() {
  const connection = useConnection();
  const [taskId, setTaskId] = useState<bigint | null>(null);
  const [task, setTask] = useState<ChainTask | null>(null);
  const [manifest, setManifest] = useState<ArtifactState<TaskManifestView>>({});
  const [result, setResult] = useState<ArtifactState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: bigint, preferRpc = false) => {
    setLoading(true);
    try {
      const nextTask = await readTask(id, { preferRpc });
      setTask(nextTask);

      const metadataRequest = fetchAndVerifyJsonArtifact(
        nextTask.metadataURI,
        nextTask.metadataHash,
        parseTaskManifest,
      );
      const resultRequest =
        nextTask.resultURI.length > 0 && nextTask.resultHash !== zeroHash
          ? fetchAndVerifyArtifact(nextTask.resultURI, nextTask.resultHash)
          : null;

      const metadataOutcome = await metadataRequest
        .then((artifact) => ({
          data: artifact.matches ? artifact.data : undefined,
          verification: artifact,
        }))
        .catch((artifactError: unknown) => ({
          error:
            artifactError instanceof Error
              ? artifactError.message
              : "Task brief unavailable.",
        }));
      setManifest(metadataOutcome);

      if (resultRequest) {
        setResult(
          await resultRequest
            .then((verification) => ({ verification }))
            .catch((artifactError: unknown) => ({
              error:
                artifactError instanceof Error
                  ? artifactError.message
                  : "Result artifact unavailable.",
            })),
        );
      } else {
        setResult({});
      }
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to read this task.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      const id = parseTaskId();
      setTaskId(id);
      if (id === null) {
        setError("Use a positive numeric task ID, for example ?id=1.");
        setLoading(false);
        return;
      }
      void load(id);
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  if (loading) {
    return <div className={styles.loading}>Reading task from Coston2…</div>;
  }

  if (error || !task || taskId === null) {
    return (
      <div className={styles.error} role="alert">
        <strong>Task unavailable</strong>
        <span>{error ?? "The requested task does not exist."}</span>
        <Link href="/tasks/">Return to marketplace</Link>
      </div>
    );
  }

  const role = getTaskRole(connection.address, task.creator, task.worker);
  const status = getTaskStatusLabel(task.status);
  const manifestVerified = manifest.verification?.matches === true;
  const resultVerified = result.verification?.matches === true;
  const metadataHref = tryResolveArtifactURI(task.metadataURI);
  const resultHref = tryResolveArtifactURI(task.resultURI);

  return (
    <>
      <section className={styles.hero}>
        <div>
          <div className={styles.topline}>
            <span>Task #{task.id.toString()}</span>
            <span className={styles.status}>{status}</span>
          </div>
          <h1>{manifest.data?.title ?? `On-chain Task #${task.id.toString()}`}</h1>
          <p>
            {manifest.data?.description ??
              "The human-readable brief is unavailable or did not pass integrity verification."}
          </p>
        </div>
        <aside>
          <span>Reward</span>
          <strong>
            {formatUnits(task.reward, rewardTokenDecimals)} {rewardTokenSymbol}
          </strong>
          <small>
            {task.status <= 2 && "Currently held by TaskBounty escrow"}
            {task.status === 3 && "Released to the assigned worker"}
            {task.status === 4 && "Refunded to the creator"}
            {task.status > 4 && "Settlement state is not recognized"}
          </small>
          <button onClick={() => void load(task.id, true)} type="button">
            Refresh chain and artifacts
          </button>
        </aside>
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.primaryColumn}>
          <article className={styles.card}>
            <div className={styles.cardHeading}>
              <div>
                <span>Committed brief</span>
                <h2>Scope and acceptance</h2>
              </div>
              <span className={manifestVerified ? styles.verified : styles.failed}>
                {manifestVerified ? "Hash verified" : "Not verified"}
              </span>
            </div>

            {manifest.data && manifestVerified ? (
              <div className={styles.briefGrid}>
                <div>
                  <h3>Deliverables</h3>
                  {manifest.data.deliverables.length > 0 ? (
                    <ul>
                      {manifest.data.deliverables.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No structured deliverables were supplied.</p>
                  )}
                </div>
                <div>
                  <h3>Acceptance criteria</h3>
                  {manifest.data.acceptanceCriteria.length > 0 ? (
                    <ul>
                      {manifest.data.acceptanceCriteria.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No structured criteria were supplied.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className={styles.artifactError}>
                {manifest.error ??
                  `Retrieved hash ${manifest.verification?.actualHash ?? "unavailable"}`}
              </p>
            )}

            <dl className={styles.artifactDetails}>
              <div>
                <dt>Metadata URI</dt>
                <dd>{metadataHref ? <a href={metadataHref} target="_blank" rel="noreferrer">Open artifact ↗</a> : "Unsupported URI"}</dd>
              </div>
              <div>
                <dt>On-chain hash</dt>
                <dd title={task.metadataHash}>{task.metadataHash}</dd>
              </div>
            </dl>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeading}>
              <div>
                <span>Worker submission</span>
                <h2>Result artifact</h2>
              </div>
              <span className={resultVerified ? styles.verified : ""}>
                {task.resultURI.length === 0
                  ? "Not submitted"
                  : resultVerified
                    ? "Hash verified"
                    : "Not verified"}
              </span>
            </div>
            {task.resultURI.length > 0 ? (
              <dl className={styles.artifactDetails}>
                <div>
                  <dt>Result URI</dt>
                  <dd>{resultHref ? <a href={resultHref} target="_blank" rel="noreferrer">Open result ↗</a> : "Unsupported URI"}</dd>
                </div>
                <div>
                  <dt>On-chain hash</dt>
                  <dd title={task.resultHash}>{task.resultHash}</dd>
                </div>
                {result.error && (
                  <div>
                    <dt>Verification error</dt>
                    <dd>{result.error}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className={styles.muted}>No result has been committed for this task.</p>
            )}
          </article>
        </div>

        <aside className={styles.sideColumn}>
          <article className={styles.card}>
            <div className={styles.cardHeading}>
              <div>
                <span>Your relationship</span>
                <h2>{getTaskRoleLabel(role)}</h2>
              </div>
            </div>
            <p className={styles.muted}>
              The role is derived from this task&apos;s live creator and worker
              addresses, not from a hard-coded demo account.
            </p>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeading}>
              <div>
                <span>On-chain participants</span>
                <h2>Escrow parties</h2>
              </div>
            </div>
            <dl className={styles.parties}>
              <div>
                <dt>Creator</dt>
                <dd title={task.creator}>{shortenAddress(task.creator)}</dd>
              </div>
              <div>
                <dt>Worker</dt>
                <dd title={task.worker}>
                  {task.worker === "0x0000000000000000000000000000000000000000"
                    ? "Unassigned"
                    : shortenAddress(task.worker)}
                </dd>
              </div>
              <div>
                <dt>Contract state</dt>
                <dd>{status}</dd>
              </div>
              <div>
                <dt>Read source</dt>
                <dd>{task.source === "indexer" ? "Indexed API" : "Public RPC"}</dd>
              </div>
            </dl>
          </article>

          <TaskActionPanel
            onConfirmed={() => void load(task.id, true)}
            resultVerified={resultVerified}
            task={task}
          />
        </aside>
      </section>
    </>
  );
}
