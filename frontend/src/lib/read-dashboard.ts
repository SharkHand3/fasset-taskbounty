import type { Address, Hex } from "viem";

import {
  activeDeployment,
  rewardTokenAddress,
} from "@/config/deployments";
import { erc20ReadAbi } from "@/lib/abi/erc20";
import { taskBountyV2Abi } from "@/lib/abi/task-bounty-v2";
import { publicClient } from "@/lib/public-client";

export interface TaskRecord {
  creator: Address;
  exists: boolean;
  metadataHash: Hex;
  metadataURI: string;
  resultHash: Hex;
  resultURI: string;
  reward: bigint;
  status: number;
  worker: Address;
}

export interface DashboardData {
  balances: {
    contract: bigint;
    creator: bigint;
    worker: bigint;
  };
  blockNumber: bigint;
  chainId: number;
  nextTaskId: bigint;
  rewardToken: Address;
  rewardTokenMatchesConfig: boolean;
  task: TaskRecord;
  tokenDecimals: number;
  tokenSymbol: string;
  totalEscrowed: bigint;
  version: string;
}

export async function readDashboardData(): Promise<DashboardData> {
  const contract = {
    abi: taskBountyV2Abi,
    address: activeDeployment.address,
  } as const;

  const [
    chainId,
    blockNumber,
    version,
    rewardToken,
    nextTaskId,
    totalEscrowed,
    task,
  ] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getBlockNumber(),
    publicClient.readContract({ ...contract, functionName: "VERSION" }),
    publicClient.readContract({ ...contract, functionName: "rewardToken" }),
    publicClient.readContract({ ...contract, functionName: "nextTaskId" }),
    publicClient.readContract({ ...contract, functionName: "totalEscrowed" }),
    publicClient.readContract({
      ...contract,
      functionName: "getTask",
      args: [activeDeployment.taskId],
    }),
  ]);

  const token = { abi: erc20ReadAbi, address: rewardToken } as const;
  const [tokenSymbol, tokenDecimals, creator, contractBalance, worker] =
    await Promise.all([
      publicClient.readContract({ ...token, functionName: "symbol" }),
      publicClient.readContract({ ...token, functionName: "decimals" }),
      publicClient.readContract({
        ...token,
        functionName: "balanceOf",
        args: [task.creator],
      }),
      publicClient.readContract({
        ...token,
        functionName: "balanceOf",
        args: [activeDeployment.address],
      }),
      publicClient.readContract({
        ...token,
        functionName: "balanceOf",
        args: [task.worker],
      }),
    ]);

  return {
    balances: {
      contract: contractBalance,
      creator,
      worker,
    },
    blockNumber,
    chainId,
    nextTaskId,
    rewardToken,
    rewardTokenMatchesConfig:
      rewardToken.toLowerCase() === rewardTokenAddress.toLowerCase(),
    task,
    tokenDecimals,
    tokenSymbol,
    totalEscrowed,
    version,
  };
}
