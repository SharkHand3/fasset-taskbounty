import { isAddress } from "viem";

import { getRuntimeConfig, type RuntimeConfig } from "./config";
import type { AppEnv } from "./types";

const statusCodes = {
  cancelled: 4,
  completed: 3,
  inprogress: 1,
  open: 0,
  submitted: 2,
} as const;

const statusLabels = [
  "Open",
  "In progress",
  "Submitted",
  "Completed",
  "Cancelled",
] as const;

interface ApiContext {
  config: RuntimeConfig;
  env: AppEnv;
  request: Request;
  requestId: string;
}

interface HealthRow {
  chain_head_block: number;
  finalized_block: number;
  last_error: string | null;
  last_scanned_block: number;
  last_synced_at: string | null;
  protocol_snapshot_block: number | null;
  task_count: number;
}

interface ProtocolRow {
  chain_head_block: number;
  contract_version: string;
  finalized_block: number;
  last_scanned_block: number;
  last_synced_at: string | null;
  next_task_id: string;
  snapshot_block: number;
  total_escrowed: string;
}

interface TaskRow {
  accepted_block: number | null;
  accepted_tx_hash: string | null;
  cancelled_block: number | null;
  cancelled_tx_hash: string | null;
  completed_block: number | null;
  completed_tx_hash: string | null;
  created_block: number;
  created_tx_hash: string;
  creator: string;
  metadata_actual_hash: string | null;
  metadata_byte_length: number | null;
  metadata_checked_at: string | null;
  metadata_description: string | null;
  metadata_error: string | null;
  metadata_hash: string;
  metadata_title: string | null;
  metadata_uri: string;
  metadata_verified: number | null;
  result_actual_hash: string | null;
  result_byte_length: number | null;
  result_checked_at: string | null;
  result_error: string | null;
  result_hash: string;
  result_uri: string;
  result_verified: number | null;
  reward_raw: string;
  status: number;
  submitted_block: number | null;
  submitted_tx_hash: string | null;
  task_id: number;
  updated_block: number;
  worker: string;
}

interface EventRow {
  actor: string | null;
  block_hash: string;
  block_number: number;
  event_name: string;
  log_index: number;
  payload_json: string;
  transaction_hash: string;
}

function corsOrigin(request: Request, config: RuntimeConfig): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return config.allowedOrigins.has(origin) ? origin : null;
}

function responseHeaders(
  request: Request,
  config: RuntimeConfig,
  cacheControl: string,
): Headers {
  const headers = new Headers({
    "cache-control": cacheControl,
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  const origin = corsOrigin(request, config);
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  return headers;
}

function json(
  context: ApiContext,
  body: unknown,
  options: { cache?: string; status?: number } = {},
): Response {
  return new Response(JSON.stringify(body), {
    headers: responseHeaders(
      context.request,
      context.config,
      options.cache ?? "no-store",
    ),
    status: options.status ?? 200,
  });
}

function success(
  context: ApiContext,
  data: unknown,
  options: { cache?: string; status?: number } = {},
): Response {
  return json(
    context,
    { data, meta: { requestId: context.requestId } },
    options,
  );
}

function failure(
  context: ApiContext,
  status: number,
  code: string,
  message: string,
): Response {
  return json(
    context,
    { error: { code, message }, meta: { requestId: context.requestId } },
    { status },
  );
}

function artifactFromRow(row: TaskRow, kind: "metadata" | "result") {
  const isMetadata = kind === "metadata";
  return {
    actualHash: isMetadata
      ? row.metadata_actual_hash
      : row.result_actual_hash,
    byteLength: isMetadata
      ? row.metadata_byte_length
      : row.result_byte_length,
    checkedAt: isMetadata
      ? row.metadata_checked_at
      : row.result_checked_at,
    description: isMetadata ? row.metadata_description : null,
    error: isMetadata ? row.metadata_error : row.result_error,
    expectedHash: isMetadata ? row.metadata_hash : row.result_hash,
    title: isMetadata ? row.metadata_title : null,
    uri: isMetadata ? row.metadata_uri : row.result_uri,
    verified:
      (isMetadata ? row.metadata_verified : row.result_verified) === 1,
  };
}

function taskFromRow(row: TaskRow) {
  return {
    artifacts: {
      metadata: artifactFromRow(row, "metadata"),
      result: row.result_uri ? artifactFromRow(row, "result") : null,
    },
    creator: row.creator,
    id: String(row.task_id),
    metadataHash: row.metadata_hash,
    metadataURI: row.metadata_uri,
    resultHash: row.result_hash,
    resultURI: row.result_uri,
    rewardRaw: row.reward_raw,
    status: {
      code: row.status,
      label: statusLabels[row.status] ?? "Unknown",
    },
    timeline: {
      accepted:
        row.accepted_block === null
          ? null
          : { blockNumber: row.accepted_block, transactionHash: row.accepted_tx_hash },
      cancelled:
        row.cancelled_block === null
          ? null
          : { blockNumber: row.cancelled_block, transactionHash: row.cancelled_tx_hash },
      completed:
        row.completed_block === null
          ? null
          : { blockNumber: row.completed_block, transactionHash: row.completed_tx_hash },
      created: {
        blockNumber: row.created_block,
        transactionHash: row.created_tx_hash,
      },
      submitted:
        row.submitted_block === null
          ? null
          : { blockNumber: row.submitted_block, transactionHash: row.submitted_tx_hash },
      updatedBlock: row.updated_block,
    },
    worker: row.worker,
  };
}

const taskSelect = `
  SELECT t.*,
    metadata.actual_hash AS metadata_actual_hash,
    metadata.verified AS metadata_verified,
    metadata.byte_length AS metadata_byte_length,
    metadata.title AS metadata_title,
    metadata.description AS metadata_description,
    metadata.checked_at AS metadata_checked_at,
    metadata.error AS metadata_error,
    result.actual_hash AS result_actual_hash,
    result.verified AS result_verified,
    result.byte_length AS result_byte_length,
    result.checked_at AS result_checked_at,
    result.error AS result_error
  FROM tasks t
  LEFT JOIN artifact_checks metadata
    ON metadata.chain_id = t.chain_id
   AND metadata.deployment_address = t.deployment_address
   AND metadata.task_id = t.task_id AND metadata.kind = 'metadata'
  LEFT JOIN artifact_checks result
    ON result.chain_id = t.chain_id
   AND result.deployment_address = t.deployment_address
   AND result.task_id = t.task_id AND result.kind = 'result'`;

async function health(context: ApiContext): Promise<Response> {
  const row = await context.env.DB
    .prepare(
      `SELECT s.last_scanned_block, s.chain_head_block, s.finalized_block,
         s.last_synced_at, s.last_error, p.snapshot_block AS protocol_snapshot_block,
         (SELECT COUNT(*) FROM tasks t WHERE t.chain_id = s.chain_id
           AND t.deployment_address = s.deployment_address) AS task_count
       FROM sync_state s
       LEFT JOIN protocol_state p ON p.chain_id = s.chain_id
        AND p.deployment_address = s.deployment_address
       WHERE s.chain_id = ? AND s.deployment_address = ?`,
    )
    .bind(context.config.chainId, context.config.contractAddress.toLowerCase())
    .first<HealthRow>();
  if (!row) {
    return failure(context, 503, "NOT_INITIALIZED", "Indexer database is not initialized.");
  }
  const lagBlocks = Math.max(0, row.finalized_block - row.last_scanned_block);
  const healthy =
    row.last_error === null &&
    row.protocol_snapshot_block !== null &&
    row.protocol_snapshot_block === row.last_scanned_block &&
    lagBlocks === 0;
  return success(context, {
    chainId: context.config.chainId,
    contract: context.config.contractAddress,
    status: healthy ? "healthy" : "degraded",
    sync: {
      chainHeadBlock: row.chain_head_block,
      finalizedBlock: row.finalized_block,
      indexedThroughBlock: row.last_scanned_block,
      lagBlocks,
      lastError: row.last_error,
      lastSyncedAt: row.last_synced_at,
    },
    taskCount: row.task_count,
  });
}

async function protocol(context: ApiContext): Promise<Response> {
  const row = await context.env.DB
    .prepare(
      `SELECT p.*, s.chain_head_block, s.finalized_block,
         s.last_scanned_block, s.last_synced_at
       FROM protocol_state p JOIN sync_state s
         ON s.chain_id = p.chain_id
        AND s.deployment_address = p.deployment_address
       WHERE p.chain_id = ? AND p.deployment_address = ?`,
    )
    .bind(context.config.chainId, context.config.contractAddress.toLowerCase())
    .first<ProtocolRow>();
  if (!row) {
    return failure(context, 503, "NOT_SYNCED", "Protocol snapshot is not available yet.");
  }
  const nextTaskId = BigInt(row.next_task_id);
  return success(
    context,
    {
      chainId: context.config.chainId,
      contract: context.config.contractAddress,
      contractVersion: row.contract_version,
      latestTaskId: (nextTaskId > 1n ? nextTaskId - 1n : 0n).toString(),
      nextTaskId: row.next_task_id,
      rewardToken: {
        address: context.config.rewardTokenAddress,
        decimals: context.config.rewardTokenDecimals,
        symbol: context.config.rewardTokenSymbol,
      },
      snapshotBlock: row.snapshot_block,
      sync: {
        chainHeadBlock: row.chain_head_block,
        finalizedBlock: row.finalized_block,
        indexedThroughBlock: row.last_scanned_block,
        lagBlocks: Math.max(0, row.finalized_block - row.last_scanned_block),
        lastSyncedAt: row.last_synced_at,
      },
      totalEscrowedRaw: row.total_escrowed,
    },
    { cache: "public, max-age=15, stale-while-revalidate=45" },
  );
}

function parseLimit(value: string | null): number | null {
  if (value === null) return 20;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 50 ? parsed : null;
}

function parseCursor(value: string | null): number | null | undefined {
  if (value === null) return undefined;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function tasks(context: ApiContext, url: URL): Promise<Response> {
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = parseCursor(url.searchParams.get("cursor"));
  if (limit === null || cursor === null) {
    return failure(context, 400, "INVALID_PAGINATION", "limit or cursor is invalid.");
  }

  const statusInput = url.searchParams.get("status")?.toLowerCase() ?? null;
  const status = statusInput
    ? statusCodes[statusInput as keyof typeof statusCodes]
    : undefined;
  if (statusInput && status === undefined) {
    return failure(context, 400, "INVALID_STATUS", "status filter is invalid.");
  }

  const creator = url.searchParams.get("creator")?.toLowerCase() ?? null;
  const worker = url.searchParams.get("worker")?.toLowerCase() ?? null;
  if ((creator && !isAddress(creator)) || (worker && !isAddress(worker))) {
    return failure(context, 400, "INVALID_ADDRESS", "participant filter is invalid.");
  }

  const clauses = ["t.chain_id = ?", "t.deployment_address = ?"];
  const bindings: unknown[] = [
    context.config.chainId,
    context.config.contractAddress.toLowerCase(),
  ];
  if (status !== undefined) {
    clauses.push("t.status = ?");
    bindings.push(status);
  }
  if (creator) {
    clauses.push("t.creator = ?");
    bindings.push(creator);
  }
  if (worker) {
    clauses.push("t.worker = ?");
    bindings.push(worker);
  }
  if (cursor !== undefined) {
    clauses.push("t.task_id < ?");
    bindings.push(cursor);
  }
  bindings.push(limit + 1);

  const result = await context.env.DB
    .prepare(
      `${taskSelect} WHERE ${clauses.join(" AND ")}
       ORDER BY t.task_id DESC LIMIT ?`,
    )
    .bind(...bindings)
    .all<TaskRow>();
  const hasMore = result.results.length > limit;
  const page = result.results.slice(0, limit);
  return success(
    context,
    {
      items: page.map(taskFromRow),
      nextCursor: hasMore ? String(page.at(-1)?.task_id) : null,
    },
    { cache: "public, max-age=15, stale-while-revalidate=45" },
  );
}

async function taskDetail(context: ApiContext, taskId: number): Promise<Response> {
  const row = await context.env.DB
    .prepare(
      `${taskSelect} WHERE t.chain_id = ? AND t.deployment_address = ?
       AND t.task_id = ?`,
    )
    .bind(
      context.config.chainId,
      context.config.contractAddress.toLowerCase(),
      taskId,
    )
    .first<TaskRow>();
  if (!row) return failure(context, 404, "TASK_NOT_FOUND", "Task was not found.");

  const events = await context.env.DB
    .prepare(
      `SELECT event_name, actor, block_number, block_hash, transaction_hash,
         log_index, payload_json FROM indexed_events
       WHERE chain_id = ? AND deployment_address = ? AND task_id = ?
       ORDER BY block_number ASC, log_index ASC`,
    )
    .bind(
      context.config.chainId,
      context.config.contractAddress.toLowerCase(),
      taskId,
    )
    .all<EventRow>();

  return success(
    context,
    {
      ...taskFromRow(row),
      events: events.results.map((event) => ({
        actor: event.actor,
        blockHash: event.block_hash,
        blockNumber: event.block_number,
        eventName: event.event_name,
        logIndex: event.log_index,
        payload: JSON.parse(event.payload_json) as unknown,
        transactionHash: event.transaction_hash,
      })),
    },
    { cache: "public, max-age=15, stale-while-revalidate=45" },
  );
}

export async function handleApiRequest(
  request: Request,
  env: AppEnv,
): Promise<Response> {
  let config: RuntimeConfig;
  try {
    config = getRuntimeConfig(env);
  } catch {
    return new Response(
      JSON.stringify({ error: { code: "INVALID_CONFIGURATION" } }),
      { headers: { "content-type": "application/json" }, status: 500 },
    );
  }

  const context: ApiContext = {
    config,
    env,
    request,
    requestId: crypto.randomUUID(),
  };
  const origin = request.headers.get("origin");
  if (origin && !config.allowedOrigins.has(origin)) {
    return failure(context, 403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed.");
  }
  if (request.method === "OPTIONS") {
    const headers = responseHeaders(request, config, "no-store");
    headers.set("access-control-allow-headers", "Content-Type");
    headers.set("access-control-allow-methods", "GET, OPTIONS");
    headers.set("access-control-max-age", "86400");
    return new Response(null, { headers, status: 204 });
  }
  if (request.method !== "GET") {
    return failure(context, 405, "METHOD_NOT_ALLOWED", "Only GET and OPTIONS are supported.");
  }

  const url = new URL(request.url);
  if (url.pathname === "/" || url.pathname === "/v1") {
    return success(context, {
      name: "TaskBounty read API",
      version: "v1",
      endpoints: ["/v1/health", "/v1/protocol", "/v1/tasks", "/v1/tasks/:id"],
    });
  }
  if (url.pathname === "/v1/health") return health(context);
  if (url.pathname === "/v1/protocol") return protocol(context);
  if (url.pathname === "/v1/tasks") return tasks(context, url);

  const detailMatch = url.pathname.match(/^\/v1\/tasks\/(\d+)$/);
  if (detailMatch) {
    const taskId = Number(detailMatch[1]);
    if (!Number.isSafeInteger(taskId) || taskId <= 0) {
      return failure(context, 400, "INVALID_TASK_ID", "Task ID is invalid.");
    }
    return taskDetail(context, taskId);
  }
  return failure(context, 404, "NOT_FOUND", "Endpoint was not found.");
}
