import { beforeEach, describe, expect, it } from "vitest";

import { ensureDeployment, eventStatements } from "../src/database";
import type { IndexedLifecycleEvent, LifecycleEventName } from "../src/types";
import { clearDatabase, testConfig, testEnv } from "./helpers";

const hashes = {
  block: `0x${"bb".repeat(32)}`,
  metadata: `0x${"11".repeat(32)}`,
  result: `0x${"22".repeat(32)}`,
} as const;

function event(
  eventName: LifecycleEventName,
  taskId: number,
  blockNumber: number,
  payload: Record<string, string>,
): IndexedLifecycleEvent {
  return {
    actor: (payload.creator ?? payload.worker ?? null) as IndexedLifecycleEvent["actor"],
    blockHash: hashes.block,
    blockNumber,
    eventName,
    logIndex: 0,
    payload,
    taskId,
    transactionHash: `0x${blockNumber.toString(16).padStart(64, "0")}`,
  };
}

async function apply(item: IndexedLifecycleEvent): Promise<void> {
  const prepared = eventStatements(
    testEnv.DB,
    testConfig,
    item,
    "2026-07-21T00:00:00.000Z",
  );
  await testEnv.DB.batch(prepared.statements);
}

describe("idempotent event projection", () => {
  beforeEach(clearDatabase);

  it("projects all five lifecycle event types without duplicate events", async () => {
    const creator = "0x43bb96f5bc968a5878c54fdcb6d599d2cccf6a2d";
    const worker = "0x149e8a5bdf5fddec7ca1163aefc0bbff91c9dcad";
    const sequence = [
      event("TaskCreated", 1, 100, {
        creator,
        metadataHash: hashes.metadata,
        metadataURI: "ipfs://task-one",
        reward: "1000000",
      }),
      event("TaskAccepted", 1, 101, { worker }),
      event("WorkSubmitted", 1, 102, {
        resultHash: hashes.result,
        resultURI: "ipfs://result-one",
        worker,
      }),
      event("TaskCompleted", 1, 103, { reward: "1000000", worker }),
      event("TaskCreated", 2, 104, {
        creator,
        metadataHash: hashes.metadata,
        metadataURI: "ipfs://task-two",
        reward: "2000000",
      }),
      event("TaskCancelled", 2, 105, { creator, refund: "2000000" }),
    ];

    for (const item of sequence) await apply(item);
    for (const item of sequence) await apply(item);

    const rows = await testEnv.DB
      .prepare("SELECT task_id, status FROM tasks ORDER BY task_id")
      .all<{ status: number; task_id: number }>();
    const count = await testEnv.DB
      .prepare("SELECT COUNT(*) AS count FROM indexed_events")
      .first<{ count: number }>();
    expect(rows.results).toEqual([
      { status: 3, task_id: 1 },
      { status: 4, task_id: 2 },
    ]);
    expect(count?.count).toBe(6);
  });

  it("fails closed when persisted deployment identity drifts", async () => {
    await testEnv.DB
      .prepare(
        `UPDATE deployments SET contract_version = 'unexpected'
         WHERE chain_id = ? AND address = ?`,
      )
      .bind(testConfig.chainId, testConfig.contractAddress.toLowerCase())
      .run();

    await expect(
      ensureDeployment(
        testEnv.DB,
        testConfig,
        "2026-07-21T00:00:00.000Z",
      ),
    ).rejects.toThrow(
      "Persisted deployment identity does not match runtime configuration.",
    );
  });
});
