import { TASK_API_URL } from "@/config/api";
import { activeDeployment } from "@/config/deployments";
import { taskBountyV2Abi } from "@/lib/abi/task-bounty-v2";
import { publicClient } from "@/lib/public-client";
import {
  fetchIndexedProtocol,
  fetchIndexedTask,
  fetchIndexedTasks,
} from "@/lib/task-api";
import type { ChainTask, ProtocolOverview } from "@/lib/task-types";

export type { ChainTask, ProtocolOverview } from "@/lib/task-types";

const contract = {
  abi: taskBountyV2Abi,
  address: activeDeployment.address,
} as const;

async function readProtocolOverviewFromRpc(): Promise<ProtocolOverview> {
  const [blockNumber, version, nextTaskId, totalEscrowed] = await Promise.all([
    publicClient.getBlockNumber(),
    publicClient.readContract({ ...contract, functionName: "VERSION" }),
    publicClient.readContract({ ...contract, functionName: "nextTaskId" }),
    publicClient.readContract({ ...contract, functionName: "totalEscrowed" }),
  ]);

  return {
    blockNumber,
    latestTaskId: nextTaskId > 1n ? nextTaskId - 1n : 0n,
    nextTaskId,
    source: "rpc",
    totalEscrowed,
    version,
  };
}

async function readTaskFromRpc(taskId: bigint): Promise<ChainTask> {
  const task = await publicClient.readContract({
    ...contract,
    functionName: "getTask",
    args: [taskId],
  });

  return { ...task, id: taskId, source: "rpc" };
}

export async function readProtocolOverview(): Promise<ProtocolOverview> {
  if (TASK_API_URL) {
    try {
      return await fetchIndexedProtocol(TASK_API_URL);
    } catch {
      // D1 is a query cache; the public RPC remains the safe availability path.
    }
  }
  return readProtocolOverviewFromRpc();
}

export async function readTask(
  taskId: bigint,
  options: { preferRpc?: boolean } = {},
): Promise<ChainTask> {
  if (TASK_API_URL && !options.preferRpc) {
    try {
      return await fetchIndexedTask(TASK_API_URL, taskId);
    } catch {
      // Fall through to the settlement source of truth.
    }
  }
  return readTaskFromRpc(taskId);
}

export async function readRecentTasks(limit = 24): Promise<{
  overview: ProtocolOverview;
  tasks: ChainTask[];
}> {
  const overview = await readProtocolOverview();
  if (TASK_API_URL && overview.source === "indexer") {
    try {
      return { overview, tasks: await fetchIndexedTasks(TASK_API_URL, limit) };
    } catch {
      const rpcOverview = await readProtocolOverviewFromRpc();
      const count = Math.min(Number(rpcOverview.latestTaskId), limit);
      const ids = Array.from(
        { length: count },
        (_, index) => rpcOverview.latestTaskId - BigInt(index),
      );
      return {
        overview: rpcOverview,
        tasks: await Promise.all(ids.map((id) => readTaskFromRpc(id))),
      };
    }
  }
  const count = Math.min(Number(overview.latestTaskId), limit);
  const ids = Array.from(
    { length: count },
    (_, index) => overview.latestTaskId - BigInt(index),
  );
  const tasks = await Promise.all(ids.map((id) => readTaskFromRpc(id)));

  return { overview, tasks };
}
