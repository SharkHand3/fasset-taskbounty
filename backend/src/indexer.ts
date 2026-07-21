import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  type Address,
  type Hex,
} from "viem";

import { taskBountyEvents, taskBountyV2Abi } from "./abi";
import { fetchAndVerifyArtifact, readBoundedBytes } from "./artifact";
import { getRuntimeConfig, type RuntimeConfig } from "./config";
import { ensureDeployment, eventStatements } from "./database";
import type {
  AppEnv,
  IndexedLifecycleEvent,
  LifecycleEventName,
  SyncResult,
} from "./types";

interface SyncStateRow {
  last_scanned_block: number;
}

interface PendingArtifactRow {
  expected_hash: Hex;
  kind: "metadata" | "result";
  task_id: number;
  uri: string;
}

interface ExplorerLog {
  address: string;
  blockNumber: Hex;
  data: Hex;
  logIndex: Hex;
  topics: Array<Hex | null>;
  transactionHash: Hex;
}

interface ExplorerLogResponse {
  message?: string;
  result?: ExplorerLog[] | string;
  status?: string;
}

const maxEventsPerRun = 8;
const explorerPageSize = maxEventsPerRun + 1;
const explorerResponseMaxBytes = 1_048_576;

function safeNumber(value: bigint, label: string): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted) || converted < 0) {
    throw new Error(`${label} exceeds the indexer's safe integer range.`);
  }
  return converted;
}

function requiredBigInt(
  args: Record<string, unknown>,
  key: string,
): bigint {
  const value = args[key];
  if (typeof value !== "bigint") throw new Error(`Missing bigint event field ${key}.`);
  return value;
}

function requiredString(
  args: Record<string, unknown>,
  key: string,
): string {
  const value = args[key];
  if (typeof value !== "string") throw new Error(`Missing string event field ${key}.`);
  return value;
}

function eventPayload(
  eventName: LifecycleEventName,
  args: Record<string, unknown>,
): { actor: Address | null; payload: Record<string, string>; taskId: number } {
  const taskId = safeNumber(requiredBigInt(args, "taskId"), "taskId");

  switch (eventName) {
    case "TaskCreated": {
      const creator = getAddress(requiredString(args, "creator")).toLowerCase() as Address;
      return {
        actor: creator,
        payload: {
          creator,
          metadataHash: requiredString(args, "metadataHash").toLowerCase(),
          metadataURI: requiredString(args, "metadataURI"),
          reward: requiredBigInt(args, "reward").toString(),
        },
        taskId,
      };
    }
    case "TaskAccepted": {
      const worker = getAddress(requiredString(args, "worker")).toLowerCase() as Address;
      return { actor: worker, payload: { worker }, taskId };
    }
    case "WorkSubmitted": {
      const worker = getAddress(requiredString(args, "worker")).toLowerCase() as Address;
      return {
        actor: worker,
        payload: {
          resultHash: requiredString(args, "resultHash").toLowerCase(),
          resultURI: requiredString(args, "resultURI"),
          worker,
        },
        taskId,
      };
    }
    case "TaskCompleted": {
      const worker = getAddress(requiredString(args, "worker")).toLowerCase() as Address;
      return {
        actor: worker,
        payload: {
          reward: requiredBigInt(args, "reward").toString(),
          worker,
        },
        taskId,
      };
    }
    case "TaskCancelled": {
      const creator = getAddress(requiredString(args, "creator")).toLowerCase() as Address;
      return {
        actor: creator,
        payload: {
          creator,
          refund: requiredBigInt(args, "refund").toString(),
        },
        taskId,
      };
    }
  }
}

function normalizeLog(log: {
  args: unknown;
  blockHash: Hex | null;
  blockNumber: bigint | null;
  eventName: string;
  logIndex: number | null;
  transactionHash: Hex | null;
}): IndexedLifecycleEvent {
  if (
    !log.blockHash ||
    log.blockNumber === null ||
    log.logIndex === null ||
    !log.transactionHash
  ) {
    throw new Error("RPC returned a pending or incomplete lifecycle log.");
  }
  if (
    ![
      "TaskAccepted",
      "TaskCancelled",
      "TaskCompleted",
      "TaskCreated",
      "WorkSubmitted",
    ].includes(log.eventName)
  ) {
    throw new Error(`Unsupported event ${log.eventName}.`);
  }

  const eventName = log.eventName as LifecycleEventName;
  const normalized = eventPayload(
    eventName,
    (log.args ?? {}) as Record<string, unknown>,
  );
  return {
    actor: normalized.actor,
    blockHash: log.blockHash,
    blockNumber: safeNumber(log.blockNumber, "blockNumber"),
    eventName,
    logIndex: log.logIndex,
    payload: normalized.payload,
    taskId: normalized.taskId,
    transactionHash: log.transactionHash,
  };
}

function makeClient(config: RuntimeConfig) {
  return createPublicClient({
    transport: http(config.rpcUrl, { retryCount: 3, timeout: 15_000 }),
  });
}

async function loadExplorerLogs(
  client: ReturnType<typeof makeClient>,
  config: RuntimeConfig,
  fromBlock: number,
  toBlock: number,
): Promise<IndexedLifecycleEvent[]> {
  const url = new URL(config.explorerApiUrl);
  url.search = new URLSearchParams({
    action: "getLogs",
    address: config.contractAddress,
    fromBlock: String(fromBlock),
    module: "logs",
    offset: String(explorerPageSize),
    page: "1",
    toBlock: String(toBlock),
  }).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    if (response.status >= 300 && response.status < 400) {
      throw new Error("Explorer API redirects are not allowed.");
    }
    throw new Error(`Explorer log request failed with HTTP ${response.status}.`);
  }
  let body: ExplorerLogResponse;
  try {
    const bytes = await readBoundedBytes(response, explorerResponseMaxBytes);
    body = JSON.parse(new TextDecoder().decode(bytes)) as ExplorerLogResponse;
  } catch (error) {
    if (error instanceof Error && error.message.includes("byte limit")) {
      throw error;
    }
    throw new Error("Explorer returned malformed JSON.");
  }
  if (!Array.isArray(body.result)) {
    if (body.message === "No logs found") return [];
    throw new Error("Explorer returned an invalid log response.");
  }
  if (body.result.length >= explorerPageSize) {
    throw new Error(
      "Explorer range contains too many events; reduce LOG_CHUNK_SIZE before retrying.",
    );
  }

  const events: IndexedLifecycleEvent[] = [];
  for (const explorerLog of body.result) {
    if (explorerLog.address.toLowerCase() !== config.contractAddress.toLowerCase()) {
      throw new Error("Explorer returned a log for an unexpected contract.");
    }
    const receipt = await client.getTransactionReceipt({
      hash: explorerLog.transactionHash,
    });
    const expectedIndex = Number.parseInt(explorerLog.logIndex, 16);
    const expectedBlockNumber = Number.parseInt(explorerLog.blockNumber, 16);
    if (
      !Number.isSafeInteger(expectedIndex) ||
      expectedIndex < 0 ||
      !Number.isSafeInteger(expectedBlockNumber) ||
      expectedBlockNumber < 0 ||
      receipt.blockNumber !== BigInt(expectedBlockNumber)
    ) {
      throw new Error("Explorer log position does not match its public RPC receipt.");
    }
    const receiptLog = receipt.logs.find(
      (log) =>
        log.logIndex === expectedIndex &&
        log.address.toLowerCase() === config.contractAddress.toLowerCase(),
    );
    if (!receiptLog) {
      throw new Error("Explorer log is not present in its public RPC receipt.");
    }
    const explorerTopics = explorerLog.topics.filter(
      (topic): topic is Hex => topic !== null,
    );
    if (
      receiptLog.data.toLowerCase() !== explorerLog.data.toLowerCase() ||
      JSON.stringify(receiptLog.topics.map((topic) => topic.toLowerCase())) !==
        JSON.stringify(explorerTopics.map((topic) => topic.toLowerCase()))
    ) {
      throw new Error("Explorer log does not match its public RPC receipt.");
    }
    const decoded = decodeEventLog({
      abi: taskBountyEvents,
      data: receiptLog.data,
      strict: true,
      topics: receiptLog.topics,
    });
    events.push(
      normalizeLog({
        args: decoded.args,
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber,
        eventName: decoded.eventName,
        logIndex: receiptLog.logIndex,
        transactionHash: receipt.transactionHash,
      }),
    );
  }
  return events.sort(
    (left, right) =>
      left.blockNumber - right.blockNumber || left.logIndex - right.logIndex,
  );
}

async function loadLifecycleLogs(
  client: ReturnType<typeof makeClient>,
  config: RuntimeConfig,
  fromBlock: number,
  toBlock: number,
): Promise<IndexedLifecycleEvent[]> {
  if (toBlock - fromBlock + 1 > 30) {
    return loadExplorerLogs(client, config, fromBlock, toBlock);
  }
  const logs = await client.getLogs({
    address: config.contractAddress,
    events: taskBountyEvents,
    fromBlock: BigInt(fromBlock),
    strict: true,
    toBlock: BigInt(toBlock),
  });
  return logs
    .map((log) => normalizeLog(log))
    .sort(
      (left, right) =>
        left.blockNumber - right.blockNumber || left.logIndex - right.logIndex,
    );
}

async function acquireLease(
  db: D1Database,
  config: RuntimeConfig,
  token: string,
  now: Date,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE sync_state SET lock_token = ?, lock_until = ?
       WHERE chain_id = ? AND deployment_address = ?
         AND (lock_until IS NULL OR lock_until < ?)`,
    )
    .bind(
      token,
      new Date(now.getTime() + 4 * 60_000).toISOString(),
      config.chainId,
      config.contractAddress.toLowerCase(),
      now.toISOString(),
    )
    .run();
  return (result.meta.changes ?? 0) === 1;
}

async function releaseLease(
  db: D1Database,
  config: RuntimeConfig,
  token: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE sync_state SET lock_token = NULL, lock_until = NULL
       WHERE chain_id = ? AND deployment_address = ? AND lock_token = ?`,
    )
    .bind(config.chainId, config.contractAddress.toLowerCase(), token)
    .run();
}

async function recordProtocolSnapshot(
  db: D1Database,
  config: RuntimeConfig,
  client: ReturnType<typeof makeClient>,
  blockNumber: number,
  now: string,
): Promise<void> {
  const contract = {
    abi: taskBountyV2Abi,
    address: config.contractAddress,
  } as const;
  const atBlock = BigInt(blockNumber);
  const [version, nextTaskId, totalEscrowed] = await Promise.all([
    client.readContract({ ...contract, blockNumber: atBlock, functionName: "VERSION" }),
    client.readContract({ ...contract, blockNumber: atBlock, functionName: "nextTaskId" }),
    client.readContract({ ...contract, blockNumber: atBlock, functionName: "totalEscrowed" }),
  ]);
  if (version !== config.contractVersion) {
    throw new Error(
      `Configured contract version ${config.contractVersion} does not match ${version}.`,
    );
  }

  await db
    .prepare(
      `INSERT INTO protocol_state
        (chain_id, deployment_address, snapshot_block, contract_version,
         next_task_id, total_escrowed, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(chain_id, deployment_address) DO UPDATE SET
         snapshot_block = excluded.snapshot_block,
         contract_version = excluded.contract_version,
         next_task_id = excluded.next_task_id,
         total_escrowed = excluded.total_escrowed,
         updated_at = excluded.updated_at`,
    )
    .bind(
      config.chainId,
      config.contractAddress.toLowerCase(),
      blockNumber,
      version,
      nextTaskId.toString(),
      totalEscrowed.toString(),
      now,
    )
    .run();
}

async function verifyPendingArtifacts(
  db: D1Database,
  config: RuntimeConfig,
  now: Date,
): Promise<void> {
  const retryBefore = new Date(now.getTime() - 60 * 60_000).toISOString();
  const pending = await db
    .prepare(
      `SELECT task_id, kind, uri, expected_hash FROM artifact_checks
       WHERE chain_id = ? AND deployment_address = ? AND verified = 0
         AND (checked_at IS NULL OR checked_at < ?)
       ORDER BY task_id DESC, kind ASC LIMIT 4`,
    )
    .bind(
      config.chainId,
      config.contractAddress.toLowerCase(),
      retryBefore,
    )
    .all<PendingArtifactRow>();

  for (const artifact of pending.results) {
    try {
      const result = await fetchAndVerifyArtifact(
        artifact.uri,
        artifact.expected_hash,
        {
          maximumBytes: config.artifactMaxBytes,
          timeoutMs: config.artifactTimeoutMs,
        },
      );
      await db
        .prepare(
          `UPDATE artifact_checks SET actual_hash = ?, verified = ?,
             byte_length = ?, title = ?, description = ?, checked_at = ?,
             error = ?
           WHERE chain_id = ? AND deployment_address = ? AND task_id = ?
             AND kind = ?`,
        )
        .bind(
          result.actualHash,
          result.verified ? 1 : 0,
          result.byteLength,
          result.title,
          result.description,
          now.toISOString(),
          result.verified ? null : "Keccak-256 hash mismatch.",
          config.chainId,
          config.contractAddress.toLowerCase(),
          artifact.task_id,
          artifact.kind,
        )
        .run();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Artifact verification failed.";
      await db
        .prepare(
          `UPDATE artifact_checks SET checked_at = ?, error = ?
           WHERE chain_id = ? AND deployment_address = ? AND task_id = ?
             AND kind = ?`,
        )
        .bind(
          now.toISOString(),
          message.slice(0, 500),
          config.chainId,
          config.contractAddress.toLowerCase(),
          artifact.task_id,
          artifact.kind,
        )
        .run();
    }
  }
}

async function finishRun(
  db: D1Database,
  runId: number,
  values: {
    error: string | null;
    eventsAdded: number;
    eventsSeen: number;
    status: "completed" | "failed" | "skipped";
    toBlock: number;
  },
): Promise<void> {
  await db
    .prepare(
      `UPDATE sync_runs SET completed_at = ?, events_seen = ?,
         events_added = ?, status = ?, error = ?, to_block = ? WHERE id = ?`,
    )
    .bind(
      new Date().toISOString(),
      values.eventsSeen,
      values.eventsAdded,
      values.status,
      values.error,
      values.toBlock,
      runId,
    )
    .run();
}

export async function syncDeployment(env: AppEnv): Promise<SyncResult> {
  const config = getRuntimeConfig(env);
  const started = new Date();
  const now = started.toISOString();
  await ensureDeployment(env.DB, config, now);

  const token = crypto.randomUUID();
  if (!(await acquireLease(env.DB, config, token, started))) {
    return {
      eventsAdded: 0,
      eventsSeen: 0,
      fromBlock: config.startBlock,
      status: "skipped",
      toBlock: config.startBlock - 1,
    };
  }

  let runId = 0;
  let eventsAdded = 0;
  let eventsSeen = 0;
  let fromBlock = config.startBlock;
  let targetBlock = config.startBlock - 1;
  let processedThroughBlock = config.startBlock - 1;

  try {
    const state = await env.DB
      .prepare(
        `SELECT last_scanned_block FROM sync_state
         WHERE chain_id = ? AND deployment_address = ?`,
      )
      .bind(config.chainId, config.contractAddress.toLowerCase())
      .first<SyncStateRow>();
    if (!state) throw new Error("Synchronization state is missing.");
    processedThroughBlock = state.last_scanned_block;

    const client = makeClient(config);
    const head = safeNumber(await client.getBlockNumber(), "chain head");
    targetBlock = Math.max(
      config.startBlock - 1,
      head - config.finalityConfirmations,
    );
    if (targetBlock < state.last_scanned_block) {
      throw new Error("Finalized chain head is behind the durable checkpoint.");
    }
    fromBlock = Math.max(config.startBlock, state.last_scanned_block + 1);
    const runTargetBlock = Math.min(
      targetBlock,
      fromBlock + config.logChunkSize * config.maxChunksPerRun - 1,
    );

    const insertedRun = await env.DB
      .prepare(
        `INSERT INTO sync_runs
          (chain_id, deployment_address, started_at, from_block, to_block, status)
         VALUES (?, ?, ?, ?, ?, 'running')`,
      )
      .bind(
        config.chainId,
        config.contractAddress.toLowerCase(),
        now,
        fromBlock,
        runTargetBlock,
      )
      .run();
    runId = Number(insertedRun.meta.last_row_id);

    for (
      let chunkStart = fromBlock;
      chunkStart <= runTargetBlock;
      chunkStart += config.logChunkSize
    ) {
      const chunkEnd = Math.min(
        runTargetBlock,
        chunkStart + config.logChunkSize - 1,
      );
      const events = await loadLifecycleLogs(
        client,
        config,
        chunkStart,
        chunkEnd,
      );
      if (events.length > maxEventsPerRun) {
        throw new Error(
          "Lifecycle event budget exceeded; reduce LOG_CHUNK_SIZE before retrying.",
        );
      }
      if (eventsSeen + events.length > maxEventsPerRun) break;
      eventsSeen += events.length;

      const statements: D1PreparedStatement[] = [];
      const eventIndexes: number[] = [];
      for (const event of events) {
        const prepared = eventStatements(env.DB, config, event, now);
        eventIndexes.push(statements.length + prepared.eventStatementIndex);
        statements.push(...prepared.statements);
      }
      statements.push(
        env.DB
          .prepare(
            `UPDATE sync_state SET last_scanned_block = ?, chain_head_block = ?,
               finalized_block = ?, last_synced_at = ?, last_error = NULL
             WHERE chain_id = ? AND deployment_address = ?`,
          )
          .bind(
            chunkEnd,
            head,
            targetBlock,
            now,
            config.chainId,
            config.contractAddress.toLowerCase(),
          ),
      );
      const results = await env.DB.batch(statements);
      for (const index of eventIndexes) {
        eventsAdded += results[index]?.meta.changes ?? 0;
      }
      processedThroughBlock = chunkEnd;
    }

    if (processedThroughBlock >= config.startBlock) {
      await recordProtocolSnapshot(
        env.DB,
        config,
        client,
        processedThroughBlock,
        new Date().toISOString(),
      );
      await verifyPendingArtifacts(env.DB, config, new Date());
      if (fromBlock > runTargetBlock) {
        await env.DB
          .prepare(
            `UPDATE sync_state SET chain_head_block = ?, finalized_block = ?,
               last_synced_at = ?, last_error = NULL
             WHERE chain_id = ? AND deployment_address = ?`,
          )
          .bind(
            head,
            targetBlock,
            new Date().toISOString(),
            config.chainId,
            config.contractAddress.toLowerCase(),
          )
          .run();
      }
    } else {
      await env.DB
        .prepare(
          `UPDATE sync_state SET chain_head_block = ?, finalized_block = ?
           WHERE chain_id = ? AND deployment_address = ?`,
        )
        .bind(
          head,
          targetBlock,
          config.chainId,
          config.contractAddress.toLowerCase(),
        )
        .run();
    }

    await finishRun(env.DB, runId, {
      error: null,
      eventsAdded,
      eventsSeen,
      status: fromBlock > targetBlock ? "skipped" : "completed",
      toBlock: processedThroughBlock,
    });
    return {
      eventsAdded,
      eventsSeen,
      fromBlock,
      status: fromBlock > targetBlock ? "skipped" : "completed",
      toBlock: processedThroughBlock,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Indexer synchronization failed.";
    await env.DB
      .prepare(
        `UPDATE sync_state SET last_error = ?
         WHERE chain_id = ? AND deployment_address = ?`,
      )
      .bind(
        message.slice(0, 1_000),
        config.chainId,
        config.contractAddress.toLowerCase(),
      )
      .run();
    if (runId > 0) {
      await finishRun(env.DB, runId, {
        error: message.slice(0, 1_000),
        eventsAdded,
        eventsSeen,
        status: "failed",
        toBlock: processedThroughBlock,
      });
    }
    throw error;
  } finally {
    await releaseLease(env.DB, config, token);
  }
}
