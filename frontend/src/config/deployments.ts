import type { Address } from "viem";

export type AbiVersion = "v1" | "v2";

export interface TaskBountyDeployment {
  address: Address;
  abiVersion: AbiVersion;
  contractVersion: string;
  label: string;
  taskId: bigint;
}

export const deployments = {
  historicalV1: {
    address: "0x6B98d7B6be4934c20bD8CdfdF2bc5Dfb3A454043",
    abiVersion: "v1",
    contractVersion: "1.x",
    label: "Historical V1",
    taskId: 1n,
  },
  currentV2: {
    address: "0x26281308BE46D9b499579CC8776615C69f29826F",
    abiVersion: "v2",
    contractVersion: "2.0.0",
    label: "Current V2",
    taskId: 1n,
  },
} as const satisfies Record<string, TaskBountyDeployment>;

export const rewardTokenAddress: Address =
  "0x0b6A3645c240605887a5532109323A3E12273dc7";

export const integrationParticipants = {
  creator: "0x43bb96F5bc968A5878C54fDcb6D599D2cccf6a2D",
  worker: "0x149e8a5BdF5FdDec7CA1163aefC0bBfF91C9DcAd",
} as const satisfies Record<"creator" | "worker", Address>;

export const activeDeployment = deployments.currentV2;
