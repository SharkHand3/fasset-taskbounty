import type { Address, Hex } from "viem";

import { activeDeployment } from "@/config/deployments";
import { taskBountyV2Abi } from "@/lib/abi/task-bounty-v2";
import { publicClient } from "@/lib/public-client";

export interface ChainTask {
  creator: Address;
  exists: boolean;
  id: bigint;
  metadataHash: Hex;
  metadataURI: string;
  resultHash: Hex;
  resultURI: string;
  reward: bigint;
  status: number;
  worker: Address;
}

export interface ProtocolOverview {
  blockNumber: bigint;
  latestTaskId: bigint;
  nextTaskId: bigint;
  totalEscrowed: bigint;
  version: string;
}

const contract = {
  abi: taskBountyV2Abi,
  address: activeDeployment.address,
} as const;

export async function readProtocolOverview(): Promise<ProtocolOverview> {
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
    totalEscrowed,
    version,
  };
}

export async function readTask(taskId: bigint): Promise<ChainTask> {
  const task = await publicClient.readContract({
    ...contract,
    functionName: "getTask",
    args: [taskId],
  });

  return { ...task, id: taskId };
}

export async function readRecentTasks(limit = 24): Promise<{
  overview: ProtocolOverview;
  tasks: ChainTask[];
}> {
  const overview = await readProtocolOverview();
  const count = Math.min(Number(overview.latestTaskId), limit);
  const ids = Array.from(
    { length: count },
    (_, index) => overview.latestTaskId - BigInt(index),
  );
  const tasks = await Promise.all(ids.map((id) => readTask(id)));

  return { overview, tasks };
}
