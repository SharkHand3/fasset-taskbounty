import {
  getAddress,
  isAddress,
  isHex,
  size,
  type Address,
  type Hex,
} from "viem";

import { activeDeployment } from "@/config/deployments";
import { coston2 } from "@/config/network";
import { TASK_API_TIMEOUT_MS } from "@/config/api";
import type { ChainTask, ProtocolOverview } from "@/lib/task-types";

interface ApiEnvelope<T> {
  data?: T;
  error?: { code?: unknown; message?: unknown };
}

interface ApiProtocol {
  chainId: unknown;
  contract: unknown;
  contractVersion: unknown;
  latestTaskId: unknown;
  nextTaskId: unknown;
  snapshotBlock: unknown;
  sync: unknown;
  totalEscrowedRaw: unknown;
}

interface ApiTask {
  creator: unknown;
  id: unknown;
  metadataHash: unknown;
  metadataURI: unknown;
  resultHash: unknown;
  resultURI: unknown;
  rewardRaw: unknown;
  status: unknown;
  worker: unknown;
}

export class TaskApiError extends Error {}

function decimalBigInt(value: unknown, label: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new TaskApiError(`Indexer returned an invalid ${label}.`);
  }
  return BigInt(value);
}

function address(value: unknown, label: string): Address {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new TaskApiError(`Indexer returned an invalid ${label}.`);
  }
  return getAddress(value);
}

function hash(value: unknown, label: string): Hex {
  if (typeof value !== "string" || !isHex(value) || size(value) !== 32) {
    throw new TaskApiError(`Indexer returned an invalid ${label}.`);
  }
  return value;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new TaskApiError(`Indexer returned an invalid ${label}.`);
  }
  return value;
}

function statusCode(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TaskApiError("Indexer returned an invalid task status.");
  }
  const code = (value as Record<string, unknown>).code;
  if (!Number.isInteger(code) || (code as number) < 0 || (code as number) > 4) {
    throw new TaskApiError("Indexer returned an invalid task status.");
  }
  return code as number;
}

async function requestData<T>(apiUrl: string, path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    TASK_API_TIMEOUT_MS,
  );
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const body = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || body.data === undefined) {
      const message =
        typeof body.error?.message === "string"
          ? body.error.message
          : `Indexer request failed with HTTP ${response.status}.`;
      throw new TaskApiError(message);
    }
    return body.data;
  } catch (error) {
    if (error instanceof TaskApiError) throw error;
    throw new TaskApiError(
      error instanceof Error ? error.message : "Indexer request failed.",
    );
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function blockBigInt(value: unknown, label: string): bigint {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TaskApiError(`Indexer returned an invalid ${label}.`);
  }
  return BigInt(value as number);
}

function parseTask(value: unknown): ChainTask {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TaskApiError("Indexer returned an invalid task.");
  }
  const task = value as ApiTask;
  return {
    creator: address(task.creator, "creator"),
    exists: true,
    id: decimalBigInt(task.id, "task ID"),
    metadataHash: hash(task.metadataHash, "metadata hash"),
    metadataURI: string(task.metadataURI, "metadata URI"),
    resultHash: hash(task.resultHash, "result hash"),
    resultURI: string(task.resultURI, "result URI"),
    reward: decimalBigInt(task.rewardRaw, "reward"),
    source: "indexer",
    status: statusCode(task.status),
    worker: address(task.worker, "worker"),
  };
}

export async function fetchIndexedProtocol(
  apiUrl: string,
): Promise<ProtocolOverview> {
  const protocol = await requestData<ApiProtocol>(apiUrl, "/v1/protocol");
  if (
    protocol.chainId !== coston2.id ||
    address(protocol.contract, "contract").toLowerCase() !==
      activeDeployment.address.toLowerCase() ||
    protocol.contractVersion !== activeDeployment.contractVersion
  ) {
    throw new TaskApiError("Indexer deployment identity does not match the app.");
  }
  if (!protocol.sync || typeof protocol.sync !== "object") {
    throw new TaskApiError("Indexer returned invalid synchronization metadata.");
  }
  const sync = protocol.sync as Record<string, unknown>;
  return {
    blockNumber: blockBigInt(protocol.snapshotBlock, "snapshot block"),
    indexedThroughBlock: blockBigInt(
      sync.indexedThroughBlock,
      "indexed block",
    ),
    lagBlocks: blockBigInt(sync.lagBlocks, "block lag"),
    latestTaskId: decimalBigInt(protocol.latestTaskId, "latest task ID"),
    nextTaskId: decimalBigInt(protocol.nextTaskId, "next task ID"),
    source: "indexer",
    totalEscrowed: decimalBigInt(
      protocol.totalEscrowedRaw,
      "total escrow",
    ),
    version: string(protocol.contractVersion, "contract version"),
  };
}

export async function fetchIndexedTask(
  apiUrl: string,
  taskId: bigint,
): Promise<ChainTask> {
  const task = parseTask(
    await requestData<ApiTask>(apiUrl, `/v1/tasks/${taskId.toString()}`),
  );
  if (task.id !== taskId) {
    throw new TaskApiError("Indexer returned a different task ID.");
  }
  return task;
}

export async function fetchIndexedTasks(
  apiUrl: string,
  limit: number,
): Promise<ChainTask[]> {
  const page = await requestData<{ items?: unknown }>(
    apiUrl,
    `/v1/tasks?limit=${limit}`,
  );
  if (!Array.isArray(page.items)) {
    throw new TaskApiError("Indexer returned an invalid task page.");
  }
  return page.items.map(parseTask);
}
