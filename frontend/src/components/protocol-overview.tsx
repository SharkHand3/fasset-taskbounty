"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";

import {
  rewardTokenDecimals,
  rewardTokenSymbol,
} from "@/config/deployments";
import {
  readProtocolOverview,
  type ProtocolOverview,
} from "@/lib/task-reader";

import styles from "./protocol-overview.module.css";

export function ProtocolOverviewCard() {
  const [data, setData] = useState<ProtocolOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await readProtocolOverview());
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Public Coston2 read failed.",
      );
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  return (
    <aside className={styles.card} aria-live="polite">
      <div className={styles.heading}>
        <div>
          <span>Live protocol</span>
          <strong>TaskBounty V{data?.version ?? "2.0.0"}</strong>
        </div>
        <span className={styles.live}>Coston2</span>
      </div>
      {error ? (
        <div className={styles.error}>
          <strong>Public read unavailable</strong>
          <span>{error}</span>
          <button onClick={() => void load()} type="button">Retry</button>
        </div>
      ) : (
        <dl>
          <div>
            <dt>Tasks created</dt>
            <dd>{data?.latestTaskId.toString() ?? "—"}</dd>
          </div>
          <div>
            <dt>Active escrow</dt>
            <dd>
              {data
                ? `${formatUnits(data.totalEscrowed, rewardTokenDecimals)} ${rewardTokenSymbol}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Latest block</dt>
            <dd>{data?.blockNumber.toLocaleString() ?? "—"}</dd>
          </div>
        </dl>
      )}
    </aside>
  );
}
